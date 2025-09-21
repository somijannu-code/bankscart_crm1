"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface ReportsFiltersProps {
  telecallers: Array<{ id: string; full_name: string }>
  defaultStartDate: string
  defaultEndDate: string
}

export function ReportsFilters({ telecallers, defaultStartDate, defaultEndDate }: ReportsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [telecaller, setTelecaller] = useState(searchParams.get("telecaller") || "all")
  const [telecallerStatus, setTelecallerStatus] = useState<Record<string, boolean>>({})

  // Fetch telecaller status
  useEffect(() => {
    const fetchTelecallerStatus = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const { data: attendanceRecords } = await supabase
          .from("attendance")
          .select("user_id, check_in")
          .eq("date", today)
        
        if (attendanceRecords) {
          // Create a map of telecaller ID to checked-in status
          const statusMap: Record<string, boolean> = {}
          attendanceRecords.forEach(record => {
            statusMap[record.user_id] = !!record.check_in
          })
          setTelecallerStatus(statusMap)
        }
      } catch (err) {
        console.error("Error fetching telecaller status:", err)
      }
    }

    fetchTelecallerStatus()
  }, [supabase])

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (startDate) params.set("start_date", startDate)
    if (endDate) params.set("end_date", endDate)
    if (telecaller !== "all") params.set("telecaller", telecaller)

    router.push(`/admin/reports?${params.toString()}`)
  }

  const clearFilters = () => {
    const today = new Date().toISOString().split("T")[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    setStartDate(thirtyDaysAgo)
    setEndDate(today)
    setTelecaller("all")
    router.push("/admin/reports")
  }

  const setQuickRange = (days: number) => {
    const today = new Date().toISOString().split("T")[0]
    const pastDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    setStartDate(pastDate)
    setEndDate(today)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label htmlFor="start-date">Start Date</Label>
          <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="end-date">End Date</Label>
          <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div>
          <Label htmlFor="telecaller">Telecaller</Label>
          <Select value={telecaller} onValueChange={setTelecaller}>
            <SelectTrigger>
              <SelectValue placeholder="All Telecallers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Telecallers</SelectItem>
              {telecallers.map((tc) => (
                <SelectItem key={tc.id} value={tc.id}>
                  <div className="flex items-center gap-2">
                    {/* Status indicator for telecaller */}
                    <div className={`w-2 h-2 rounded-full ${telecallerStatus[tc.id] ? 'bg-green-500' : 'bg-red-500'}`} 
                         title={telecallerStatus[tc.id] ? 'Checked in' : 'Not checked in'} />
                    {tc.full_name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end gap-2">
          <Button onClick={applyFilters} className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Apply
          </Button>
          <Button variant="outline" onClick={clearFilters} className="flex items-center gap-2 bg-transparent">
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Quick Date Ranges */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setQuickRange(7)} className="bg-transparent">
          Last 7 days
        </Button>
        <Button variant="outline" size="sm" onClick={() => setQuickRange(30)} className="bg-transparent">
          Last 30 days
        </Button>
        <Button variant="outline" size="sm" onClick={() => setQuickRange(90)} className="bg-transparent">
          Last 90 days
        </Button>
        <Button variant="outline" size="sm" onClick={() => setQuickRange(365)} className="bg-transparent">
          Last year
        </Button>
      </div>
    </div>
  )
}