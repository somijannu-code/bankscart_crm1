"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Users, Calendar, CheckCircle, Clock, TrendingUp, Target, BarChart3, RefreshCw, Plus } from "lucide-react"
import { TodaysTasks } from "@/components/todays-tasks"
import { RecentLeads } from "@/components/recent-leads"
import { useRouter } from "next/navigation"
import { AttendanceWidget } from "@/components/attendance-widget"
import { NotificationProvider } from "@/components/notification-provider"
import { QuickActions } from "@/components/quick-actions"
import { PerformanceMetrics } from "@/components/performance-metrics"
import { DailyTargetProgress } from "@/components/daily-target-progress"
import { ErrorBoundary } from "@/components/error-boundary"
import { LoadingSpinner } from "@/components/loading-spinner"
import { EmptyState } from "@/components/empty-state"
import { useEffect, useState } from "react"

// Types
interface DashboardStats {
  title: string
  value: number | string
  icon: React.ComponentType<any>
  color: string
  bgColor: string
  trend?: number
  format?: "number" | "percentage" | "duration"
}

interface TelecallerData {
  stats: DashboardStats[]
  conversionRate: number
  successRate: number
  avgCallDuration: number
  targets: any
  user: any
  isLoading: boolean
  error: string | null
}

export default function TelecallerDashboard() {
  const router = useRouter()
  const [data, setData] = useState<TelecallerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true)
        const supabase = createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          router.push("/auth/login")
          return
        }

        // Get telecaller statistics
        const [
          myLeadsResponse,
          todaysCallsResponse,
          pendingFollowUpsResponse,
          completedTodayResponse,
          callLogsResponse,
          targetsResponse
        ] = await Promise.allSettled([
          supabase.from("leads").select("*", { count: "exact", head: true }).eq("assigned_to", user.id),
          supabase
            .from("call_logs")
            .select("*, duration", { count: "exact" })
            .eq("user_id", user.id)
            .gte("created_at", new Date().toISOString().split("T")[0]),
          supabase
            .from("follow_ups")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "pending"),
          supabase
            .from("follow_ups")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "completed")
            .gte("completed_at", new Date().toISOString().split("T")[0]),
          supabase
            .from("call_logs")
            .select("*, duration, outcome")
            .eq("user_id", user.id)
            .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
          supabase
            .from("user_targets")
            .select("*")
            .eq("user_id", user.id)
            .eq("month", new Date().getMonth() + 1)
            .eq("year", new Date().getFullYear())
            .single()
        ])

        // Helper functions
        const getDataFromResponse = (response: PromiseSettledResult<any>, defaultValue: any = 0) => {
          return response.status === "fulfilled" ? response.value.data : defaultValue
        }

        const getCountFromResponse = (response: PromiseSettledResult<any>) => {
          return response.status === "fulfilled" ? response.value.count || 0 : 0
        }

        // Extract data
        const myLeads = getCountFromResponse(myLeadsResponse)
        const todaysCallsData = getDataFromResponse(todaysCallsResponse, [])
        const todaysCalls = Array.isArray(todaysCallsData) ? todaysCallsData.length : 0
        const pendingFollowUps = getCountFromResponse(pendingFollowUpsResponse)
        const completedToday = getCountFromResponse(completedTodayResponse)
        const callLogs = getDataFromResponse(callLogsResponse, [])
        const targets = getDataFromResponse(targetsResponse, null)

        // Calculate advanced metrics
        const successfulCalls = Array.isArray(callLogs) 
          ? callLogs.filter(log => log.outcome === "successful" || log.outcome === "interested").length 
          : 0
        const totalCalls = Array.isArray(callLogs) ? callLogs.length : 0
        const conversionRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0
        
        const avgCallDuration = Array.isArray(callLogs) && callLogs.length > 0
          ? Math.round(callLogs.reduce((acc, log) => acc + (log.duration || 0), 0) / callLogs.length / 60)
          : 0

        const successRate = (completedToday + todaysCalls) > 0 
          ? Math.round((completedToday / (completedToday + pendingFollowUps)) * 100)
          : 0

        const stats: DashboardStats[] = [
          {
            title: "My Leads",
            value: myLeads,
            icon: Users,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
          },
          {
            title: "Today's Calls",
            value: todaysCalls,
            icon: Phone,
            color: "text-green-600",
            bgColor: "bg-green-50",
          },
          {
            title: "Pending Follow-ups",
            value: pendingFollowUps,
            icon: Clock,
            color: "text-orange-600",
            bgColor: "bg-orange-50",
          },
          {
            title: "Completed Today",
            value: completedToday,
            icon: CheckCircle,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
          },
          {
            title: "Conversion Rate",
            value: conversionRate,
            icon: TrendingUp,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            format: "percentage"
          },
          {
            title: "Avg Call Duration",
            value: avgCallDuration,
            icon: Clock,
            color: "text-amber-600",
            bgColor: "bg-amber-50",
            format: "duration"
          },
        ]

        setData({
          stats,
          conversionRate,
          successRate,
          avgCallDuration,
          targets,
          user,
          isLoading: false,
          error: null
        })

      } catch (err) {
        console.error("Dashboard error:", err)
        setError("Failed to load dashboard data")
        setIsLoading(false)
      }
    }

    loadDashboardData()
  }, [router])

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleAddLead = () => {
    // Implement add lead functionality
    console.log("Add lead clicked")
  }

  const formatValue = (stat: DashboardStats) => {
    if (stat.format === "percentage") return `${stat.value}%`
    if (stat.format === "duration") return `${stat.value}m`
    return stat.value.toString()
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-96">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <Phone className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load dashboard</h2>
          <p className="text-gray-600 mb-6">{error || "There was a problem loading your dashboard data."}</p>
          <Button onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  const { stats, user, targets, conversionRate, successRate, avgCallDuration } = data

  return (
    <NotificationProvider userId={user.id}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user.email?.split('@')[0] || 'Telecaller'}!</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button size="sm" className="flex items-center gap-2" onClick={handleAddLead}>
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <ErrorBoundary fallback={<div>Quick actions unavailable</div>}>
          <QuickActions userId={user.id} />
        </ErrorBoundary>

        {/* Daily Target Progress */}
        {targets && (
          <ErrorBoundary fallback={<div>Target progress unavailable</div>}>
            <DailyTargetProgress 
              userId={user.id} 
              targets={targets}
              currentCalls={typeof stats[1]?.value === 'number' ? stats[1].value : 0}
              currentCompleted={typeof stats[3]?.value === 'number' ? stats[3].value : 0}
            />
          </ErrorBoundary>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatValue(stat)}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Metrics */}
        <ErrorBoundary fallback={<div>Performance metrics unavailable</div>}>
          <PerformanceMetrics 
            userId={user.id}
            conversionRate={conversionRate}
            successRate={successRate}
            avgCallDuration={avgCallDuration}
          />
        </ErrorBoundary>

        {/* Attendance Widget */}
        <ErrorBoundary fallback={<div>Attendance widget unavailable</div>}>
          <AttendanceWidget userId={user.id} />
        </ErrorBoundary>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Tasks */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Today's Tasks
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <ErrorBoundary 
                fallback={
                  <EmptyState
                    icon={Calendar}
                    title="Unable to load tasks"
                    description="Please try refreshing the page"
                  />
                }
              >
                <TodaysTasks userId={user.id} />
              </ErrorBoundary>
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Recent Leads
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <ErrorBoundary 
                fallback={
                  <EmptyState
                    icon={Users}
                    title="Unable to load leads"
                    description="Please try refreshing the page"
                  />
                }
              >
                <RecentLeads userId={user.id} />
              </ErrorBoundary>
            </CardContent>
          </Card>
        </div>

        {/* Additional Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Follow-ups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Upcoming Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Clock}
                title="No upcoming follow-ups"
                description="All follow-ups are completed for today"
              />
            </CardContent>
          </Card>

          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-5 w-5" />
                Weekly Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={BarChart3}
                title="Performance data loading"
                description="Weekly analytics will be available soon"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </NotificationProvider>
  )
}
