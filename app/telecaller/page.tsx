import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Users, Calendar, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { TodaysTasks } from "@/components/todays-tasks"
import { RecentLeads } from "@/components/recent-leads"
import { redirect } from "next/navigation"
import { AttendanceWidget } from "@/components/attendance-widget"
import { NotificationProvider } from "@/components/notification-provider"
// import { TestNotifications } from "@/components/test-notifications"  // Remove this in production

export default async function TelecallerDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get telecaller statistics
  const [{ count: myLeads }, { count: todaysCalls }, { count: pendingFollowUps }, { count: completedToday }] =
    await Promise.all([
      supabase.from("leads").select("*", { count: "exact", head: true }).eq("assigned_to", user.id),
      supabase
        .from("call_logs")
        .select("*", { count: "exact", head: true })
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
    ])

  const stats = [
    {
      title: "My Leads",
      value: myLeads || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Today's Calls",
      value: todaysCalls || 0,
      icon: Phone,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Follow-ups",
      value: pendingFollowUps || 0,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Completed Today",
      value: completedToday || 0,
      icon: CheckCircle,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ]

  return (
    <NotificationProvider userId={user.id}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome to your telecaller workspace</p>
          </div>
        </div>

        {/* Test Notifications - Remove this in production */}
        <TestNotifications />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <AttendanceWidget />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today's Tasks
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
                <TrendingUp className="h-5 w-5" />
                Recent Leads
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
