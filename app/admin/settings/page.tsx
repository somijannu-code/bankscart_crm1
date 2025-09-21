import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Settings, Save, Users, Database, Bell, Shield } from "lucide-react"

export default async function SettingsPage() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get system stats
  const { count: totalUsers } = await supabase.from("users").select("*", { count: "exact", head: true })

  const { count: totalLeads } = await supabase.from("leads").select("*", { count: "exact", head: true })

  const { count: activeUsers } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)

  const updateSystemSettings = async (formData: FormData) => {
    "use server"
    // This would typically update system configuration in a settings table
    console.log("System settings updated:", Object.fromEntries(formData))
  }

  const updateNotificationSettings = async (formData: FormData) => {
    "use server"
    // This would typically update notification preferences
    console.log("Notification settings updated:", Object.fromEntries(formData))
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-blue-50">
          <Settings className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage system configuration and preferences</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                System Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Users</span>
                <span className="font-semibold">{totalUsers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="font-semibold">{activeUsers || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Leads</span>
                <span className="font-semibold">{totalLeads || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">System Status</span>
                <span className="text-green-600 font-semibold">Online</span>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Two-Factor Auth</span>
                <Switch />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Session Timeout</span>
                <span className="text-sm">24 hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Password Policy</span>
                <span className="text-sm">Strong</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* System Settings */}
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateSystemSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input id="company_name" name="company_name" defaultValue="Bankscart CRM" />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input id="timezone" name="timezone" defaultValue="UTC" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Default Currency</Label>
                    <Input id="currency" name="currency" defaultValue="USD" />
                  </div>
                  <div>
                    <Label htmlFor="date_format">Date Format</Label>
                    <Input id="date_format" name="date_format" defaultValue="MM/DD/YYYY" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="company_address">Company Address</Label>
                  <Textarea
                    id="company_address"
                    name="company_address"
                    rows={3}
                    defaultValue="123 Business Street, City, State 12345"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="auto_assign" name="auto_assign" />
                  <Label htmlFor="auto_assign">Auto-assign new leads to available telecallers</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="email_notifications" name="email_notifications" defaultChecked />
                  <Label htmlFor="email_notifications">Enable email notifications</Label>
                </div>

                <Button type="submit" className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save System Settings
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateNotificationSettings} className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="new_lead_notifications">New Lead Notifications</Label>
                      <p className="text-sm text-gray-500">Get notified when new leads are added</p>
                    </div>
                    <Switch id="new_lead_notifications" name="new_lead_notifications" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="assignment_notifications">Assignment Notifications</Label>
                      <p className="text-sm text-gray-500">Notify telecallers when leads are assigned</p>
                    </div>
                    <Switch id="assignment_notifications" name="assignment_notifications" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="followup_reminders">Follow-up Reminders</Label>
                      <p className="text-sm text-gray-500">Send reminders for scheduled follow-ups</p>
                    </div>
                    <Switch id="followup_reminders" name="followup_reminders" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="daily_reports">Daily Reports</Label>
                      <p className="text-sm text-gray-500">Receive daily performance reports</p>
                    </div>
                    <Switch id="daily_reports" name="daily_reports" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weekly_summaries">Weekly Summaries</Label>
                      <p className="text-sm text-gray-500">Get weekly team performance summaries</p>
                    </div>
                    <Switch id="weekly_summaries" name="weekly_summaries" defaultChecked />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Settings
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* User Management Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_leads_per_telecaller">Max Leads per Telecaller</Label>
                  <Input
                    id="max_leads_per_telecaller"
                    name="max_leads_per_telecaller"
                    type="number"
                    defaultValue="50"
                  />
                </div>
                <div>
                  <Label htmlFor="session_timeout">Session Timeout (hours)</Label>
                  <Input id="session_timeout" name="session_timeout" type="number" defaultValue="24" />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="require_approval" name="require_approval" />
                <Label htmlFor="require_approval">Require admin approval for new user registrations</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="force_password_change" name="force_password_change" />
                <Label htmlFor="force_password_change">Force password change on first login</Label>
              </div>

              <Button className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Save User Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
