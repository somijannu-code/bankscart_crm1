import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Phone,
  Users,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  User,
  ArrowRight,
  Target,
} from "lucide-react"
import { TodaysTasks } from "@/components/todays-tasks"
import { RecentLeads } from "@/components/recent-leads"
import { redirect } from "next/navigation"
import { AttendanceWidget } from "@/components/attendance-widget"
import { NotificationProvider } from "@/components/notification-provider"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// --- New/Enhanced Dashboard Components (Assumed) ---

// 1. Quick Actions Component (for Call/Lead creation)
const QuickActions = () => (
  <div className="flex flex-wrap gap-4">
    <Button asChild className="bg-green-600 hover:bg-green-700">
      <Link href="/leads/new">
        <Zap className="mr-2 h-4 w-4" />
        Add New Lead
      </Link>
    </Button>
    <Button asChild variant="outline">
      <Link href="/calls/log">
        <Phone className="mr-2 h-4 w-4" />
        Log New Call
      </Link>
    </Button>
    <Button asChild variant="secondary">
      <Link href="/followups">
        <Clock className="mr-2 h-4 w-4" />
        View All Pending
      </Link>
    </Button>
  </div>
)

// 2. Call Metrics Card (Enhanced KPI)
// NOTE: This assumes you have tables/functions for 'total_call_duration' and 'leads_converted'
interface CallMetricsProps {
  avgTalkTime: number
  conversionRate: number
}

const CallMetrics = ({ avgTalkTime, conversionRate }: CallMetricsProps) => (
  <Card className="col-span-1 lg:col-span-2 shadow-lg border-l-4 border-l-orange-500">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-orange-600">
        <TrendingUp className="h-5 w-5" />
        Performance Snapshot
      </CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-sm font-medium text-gray-600">Avg. Talk Time (Today)</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{avgTalkTime.toFixed(1)} min</p>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">Leads Converted (Week)</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{conversionRate}%</p>
      </div>
    </CardContent>
  </Card>
)

export default async function TelecallerDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
    // Fetching user details (e.g., name, avatar) if stored in user_metadata
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // --- Start: Enhanced Data Fetching ---

  const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD for date-only comparison

  const [
    { count: myLeads },
    { count: todaysCalls },
    { count: pendingFollowUps },
    { count: completedToday },
    { data: leadStatuses }, // New: Fetch lead status breakdown
  ] = await Promise.all([
    supabase.from("leads").select("*", { count: "exact", head: true }).eq("assigned_to", user.id),
    supabase.from("call_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", today),
    supabase.from("follow_ups").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "pending"),
    supabase.from("follow_ups").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "completed").gte("completed_at", today),
    supabase.from("leads").select("status").eq("assigned_to", user.id), // Fetch statuses for breakdown
  ])

  // --- Simulate Enhanced Metrics (Replace with actual DB calls for real app) ---
  const myNewLeads = leadStatuses?.filter((l) => l.status === "New")?.length || 0
  const avgTalkTime = 4.2 // Placeholder: Replace with calculation from call_logs
  const conversionRate = 12 // Placeholder: Replace with calculation (e.g., booked meetings / total leads)

  const stats = [
    {
      title: "My Total Leads",
      value: myLeads || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/leads",
    },
    {
      title: "New Leads Assigned",
      value: myNewLeads,
      icon: User,
      color: "text-red-600",
      bgColor: "bg-red-50",
      href: "/leads?status=new",
    },
    {
      title: "Today's Calls",
      value: todaysCalls || 0,
      icon: Phone,
      color: "text-green-600",
      bgColor: "bg-green-50",
      href: "/call-logs",
    },
    {
      title: "Pending Follow-ups",
      value: pendingFollowUps || 0,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      href: "/followups?status=pending",
    },
    {
      title: "Completed Today",
      value: completedToday || 0,
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/followups?status=completed",
    },
  ]

  const userDisplayName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Telecaller"
  // --- End: Enhanced Data Fetching ---

  return (
    <NotificationProvider userId={user.id}>
      <div className="p-6 space-y-8">
        {/* Header and Quick Actions */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {userDisplayName}! Focus on your tasks.</p>
          </div>
          <QuickActions />
        </div>

        {/* Stats Cards (Now 5 in total) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {stats.map((stat, index) => (
            // Card is now a clickable Link
            <Card key={index} asChild className="hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
              <Link href={stat.href}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="flex items-center text-xs mt-3 text-blue-500">
                      View Details
                      <ArrowRight className="ml-1 h-3 w-3" />
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>

        {/* Attendance and Performance Widget Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AttendanceWidget />
            <CallMetrics avgTalkTime={avgTalkTime} conversionRate={conversionRate} />
        </div>


        {/* Tasks and Recent Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-500" />
                Today's Priority Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TodaysTasks userId={user.id} />
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-yellow-500" />
                Recent Lead Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RecentLeads userId={user.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </NotificationProvider>
  )
}
