"use client"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MapPin, Calendar, MessageSquare, ArrowLeft, Clock } from "lucide-react"
import Link from "next/link"
import { LeadStatusUpdater } from "@/components/lead-status-updater"
import { LeadNotes } from "@/components/lead-notes"
import { LeadCallHistory } from "@/components/lead-call-history"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimelineView } from "@/components/timeline-view"
import { FollowUpsList } from "@/components/follow-ups-list"

export default function LeadDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [lead, setLead] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timelineData, setTimelineData] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()

        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !currentUser) {
          router.push("/auth/login")
          return
        }

        setUser(currentUser)

        const { data: leadData, error: leadError } = await supabase
          .from("leads")
          .select("*")
          .eq("id", params.id)
          .single()

        if (leadError || !leadData) {
          setError("Lead not found")
          setLoading(false)
          return
        }

        setLead(leadData)

        // Fetch timeline data (notes, follow-ups, calls)
        await fetchTimelineData(params.id, supabase)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Failed to load lead data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id, router])

  const fetchTimelineData = async (leadId: string, supabase: any) => {
    try {
      // Fetch notes
      const { data: notes, error: notesError } = await supabase
        .from("notes")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })

      if (notesError) console.error("Error fetching notes:", notesError)

      // Fetch follow-ups
      const { data: followUps, error: followUpsError } = await supabase
        .from("follow_ups")
        .select("*")
        .eq("lead_id", leadId)
        .order("scheduled_date", { ascending: false })

      if (followUpsError) console.error("Error fetching follow-ups:", followUpsError)

      // Fetch call history
      const { data: callHistory, error: callHistoryError } = await supabase
        .from("call_logs")
        .select("*")
        .eq("lead_id", leadId)
        .order("called_at", { ascending: false })

      if (callHistoryError) console.error("Error fetching call history:", callHistoryError)

      // Combine all data into a timeline
      const timeline = [
        ...(notes || []).map((note: any) => ({
          type: "note",
          id: note.id,
          title: note.note_type === "status_change" ? "Status changed" : "Note added",
          description: note.note || "No description",
          user: "You",
          date: note.created_at,
          icon: <MessageSquare className="h-4 w-4" />,
        })),
        ...(followUps || []).map((followUp: any) => ({
          type: "follow_up",
          id: followUp.id,
          title: "Follow-up scheduled",
          description: `Scheduled for ${followUp.scheduled_date ? new Date(followUp.scheduled_date).toLocaleString() : "Unknown date"} - Status: ${followUp.status || "unknown"}`,
          user: "You",
          date: followUp.created_at,
          icon: <Calendar className="h-4 w-4" />,
        })),
        ...(callHistory || []).map((call: any) => ({
          type: "call",
          id: call.id,
          title: "Call made",
          description: `Duration: ${call.duration_seconds || "N/A"} seconds, Outcome: ${call.outcome || "N/A"}`,
          user: "You",
          date: call.called_at,
          icon: <Phone className="h-4 w-4" />,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setTimelineData(timeline)
    } catch (error) {
      console.error("Error fetching timeline data:", error)
    }
  }

  const getSafeValue = (value: any, defaultValue = "N/A") => {
    return value ?? defaultValue
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
          <Link href="/telecaller/leads">
            <Button variant="outline" className="mt-4 bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Leads
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!lead) {
    return null
  }

  const getStatusColor = (status: string) => {
    const colors = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-yellow-100 text-yellow-800",
      Interested: "bg-green-100 text-green-800",
      Documents_Sent: "bg-purple-100 text-purple-800",
      Login: "bg-orange-100 text-orange-800",
      Disbursed: "bg-emerald-100 text-emerald-800",
      Not_Interested: "bg-red-100 text-red-800",
      Call_Back: "bg-indigo-100 text-indigo-800",
      not_eligible: "bg-red-100 text-red-800",
      nr: "bg-gray-100 text-gray-800",
      self_employed: "bg-amber-100 text-amber-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-gray-100 text-gray-800",
      medium: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    }
    return colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const makeCall = (phone: string) => {
    if (phone && phone !== "N/A") {
      if (typeof window !== "undefined") {
        window.open(`tel:${phone}`, "_self")
      }
    }
  }

  const sendEmail = (email: string) => {
    if (email && email !== "N/A") {
      if (typeof window !== "undefined") {
        window.open(`mailto:${email}`, "_blank")
      }
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/telecaller/leads">
          <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent">
            <ArrowLeft className="h-4 w-4" />
            Back to Leads
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{getSafeValue(lead.name, "Unknown Lead")}</h1>
          <p className="text-gray-600 mt-1">Lead Details & Management</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="calls">Call History</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lead Information */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Lead Information
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(getSafeValue(lead.status, "new"))}>
                        {getSafeValue(lead.status, "new").replace("_", " ").toUpperCase()}
                      </Badge>
                      <Badge className={getPriorityColor(getSafeValue(lead.priority, "medium"))}>
                        {getSafeValue(lead.priority, "medium").toUpperCase()}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Contact Information</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <button
                            onClick={() => makeCall(lead.phone)}
                            className="text-blue-600 hover:underline"
                            disabled={!lead.phone || lead.phone === "N/A"}
                          >
                            {getSafeValue(lead.phone, "No phone number")}
                          </button>
                        </div>
                        {lead.email && lead.email !== "N/A" && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            <button onClick={() => sendEmail(lead.email)} className="text-blue-600 hover:underline">
                              {getSafeValue(lead.email, "No email")}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Company Details</h4>
                      <div className="space-y-1">
                        {lead.company && lead.company !== "N/A" && (
                          <p className="text-sm text-gray-600">Company: {lead.company}</p>
                        )}
                        {lead.designation && lead.designation !== "N/A" && (
                          <p className="text-sm text-gray-600">Position: {lead.designation}</p>
                        )}
                        <p className="text-sm text-gray-600">Source: {getSafeValue(lead.source, "Unknown")}</p>
                      </div>
                    </div>
                  </div>

                  {(lead.address || lead.city || lead.state || lead.country) && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Address
                      </h4>
                      <div className="text-sm text-gray-600">
                        {lead.address && <p>{lead.address}</p>}
                        <p>{[lead.city, lead.state, lead.zip_code, lead.country].filter(Boolean).join(", ")}</p>
                      </div>
                    </div>
                  )}

                  {lead.notes && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Initial Notes</h4>
                      <p className="text-sm text-gray-600">{getSafeValue(lead.notes, "No notes")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timelineData.length > 0 ? (
                    <div className="space-y-4">
                      {timelineData.slice(0, 5).map((item) => (
                        <div key={item.id} className="flex items-start gap-3">
                          <div className="mt-1 p-1 bg-gray-100 rounded-full">{item.icon}</div>
                          <div className="flex-1">
                            <p className="font-medium">{getSafeValue(item.title)}</p>
                            <p className="text-sm text-gray-600">{getSafeValue(item.description)}</p>
                            <p className="text-xs text-gray-500">
                              By {getSafeValue(item.user)} •{" "}
                              {item.date ? new Date(item.date).toLocaleString() : "Unknown date"}
                            </p>
                          </div>
                        </div>
                      ))}
                      {timelineData.length > 5 && (
                        <Button
                          variant="link"
                          onClick={() => {
                            const timelineTab = document.querySelector('[data-value="timeline"]') as HTMLElement
                            if (timelineTab) timelineTab.click()
                          }}
                        >
                          View all activities
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">No recent activity</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Actions Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => makeCall(lead.phone)}
                    className="w-full flex items-center gap-2"
                    disabled={!lead.phone || lead.phone === "N/A"}
                  >
                    <Phone className="h-4 w-4" />
                    Call Now
                  </Button>
                  {lead.email && lead.email !== "N/A" && (
                    <Button
                      variant="outline"
                      onClick={() => sendEmail(lead.email)}
                      className="w-full flex items-center gap-2 bg-transparent"
                    >
                      <Mail className="h-4 w-4" />
                      Send Email
                    </Button>
                  )}
                  <Link href={`/telecaller/leads/${lead.id}/follow-up`}>
                    <Button variant="outline" className="w-full flex items-center gap-2 bg-transparent">
                      <Calendar className="h-4 w-4" />
                      Schedule Follow-up
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Update Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <LeadStatusUpdater leadId={lead.id} currentStatus={lead.status} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lead Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <Badge className={getStatusColor(getSafeValue(lead.status, "new"))}>
                      {getSafeValue(lead.status, "new").replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Priority:</span>
                    <Badge className={getPriorityColor(getSafeValue(lead.priority, "medium"))}>
                      {getSafeValue(lead.priority, "medium")}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="text-sm">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "Unknown"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Contacted:</span>
                    <span className="text-sm">
                      {lead.last_contacted ? new Date(lead.last_contacted).toLocaleDateString() : "Never"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Notes:</span>
                    <span className="text-sm">{timelineData.filter((item) => item.type === "note").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Calls:</span>
                    <span className="text-sm">{timelineData.filter((item) => item.type === "call").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Follow-ups:</span>
                    <span className="text-sm">{timelineData.filter((item) => item.type === "follow_up").length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Complete Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineView data={timelineData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notes & Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadNotes leadId={lead.id} userId={user?.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Call History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadCallHistory leadId={lead.id} userId={user?.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followups">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FollowUpsList leadId={lead.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
