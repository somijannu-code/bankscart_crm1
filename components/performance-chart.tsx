"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface PerformanceChartProps {
  startDate: string
  endDate: string
  telecallerId?: string
}

export function PerformanceChart({ startDate, endDate, telecallerId }: PerformanceChartProps) {
  const [data, setData] = useState<Array<{ date: string; leads: number; calls: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Generate date range
        const dates = []
        const start = new Date(startDate)
        const end = new Date(endDate)

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(new Date(d).toISOString().split("T")[0])
        }

        const chartData = []

        for (const date of dates) {
          let leadsQuery = supabase
            .from("leads")
            .select("*", { count: "exact", head: true })
            .gte("created_at", date)
            .lt("created_at", `${date}T23:59:59`)

          let callsQuery = supabase
            .from("call_logs")
            .select("*", { count: "exact", head: true })
            .gte("created_at", date)
            .lt("created_at", `${date}T23:59:59`)

          if (telecallerId) {
            leadsQuery = leadsQuery.eq("assigned_to", telecallerId)
            callsQuery = callsQuery.eq("user_id", telecallerId)
          }

          const [{ count: leads }, { count: calls }] = await Promise.all([leadsQuery, callsQuery])

          chartData.push({
            date: new Date(date).toLocaleDateString(),
            leads: leads || 0,
            calls: calls || 0,
          })
        }

        setData(chartData)
      } catch (error) {
        console.error("Error fetching performance data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate, telecallerId, supabase])

  if (isLoading) {
    return <div className="h-64 flex items-center justify-center">Loading chart...</div>
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} name="New Leads" />
          <Line type="monotone" dataKey="calls" stroke="#10B981" strokeWidth={2} name="Calls Made" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
