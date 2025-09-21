"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, CheckCircle } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Task {
  id: string
  title: string
  follow_up_type: string
  scheduled_at: string
  status: string
  priority: string
  lead: {
    name: string
    phone: string
  }
}

export function TodaysTasks({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const today = new Date().toISOString().split("T")[0]
        const { data } = await supabase
          .from("follow_ups")
          .select(`
            id,
            title,
            follow_up_type,
            scheduled_at,
            status,
            priority,
            leads!follow_ups_lead_id_fkey(name, phone)
          `)
          .eq("user_id", userId)
          .gte("scheduled_at", today)
          .lt("scheduled_at", `${today}T23:59:59`)
          .order("scheduled_at", { ascending: true })

        setTasks(data || [])
      } catch (error) {
        console.error("Error fetching tasks:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [userId, supabase])

  const completeTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("follow_ups")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId)

      if (error) throw error

      setTasks((prev) => prev.filter((task) => task.id !== taskId))
    } catch (error) {
      console.error("Error completing task:", error)
    }
  }

  const makeCall = (phone: string) => {
    window.open(`tel:${phone}`, "_self")
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

  if (isLoading) {
    return <div className="text-center py-4">Loading tasks...</div>
  }

  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No tasks scheduled for today</p>
      ) : (
        tasks.map((task) => (
          <div key={task.id} className="p-4 border rounded-lg hover:bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{task.title}</h4>
                  <Badge className={getPriorityColor(task.priority)}>{task.priority.toUpperCase()}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">Lead: {task.lead?.name}</p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(task.scheduled_at), { addSuffix: true })}
                </p>
              </div>
              <div className="flex gap-2">
                {task.follow_up_type === "call" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => makeCall(task.lead?.phone)}
                    className="flex items-center gap-1"
                  >
                    <Phone className="h-3 w-3" />
                    Call
                  </Button>
                )}
                <Button size="sm" onClick={() => completeTask(task.id)} className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Done
                </Button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
