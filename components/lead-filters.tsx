"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { useState, useEffect } from "react"
// NOTE on Compilation Fix: Removed 'next/navigation' and 'createClient' imports 
// as they caused compilation errors due to external dependencies/path aliases.
// In your actual Next.js project, you should re-add:
// import { useRouter, useSearchParams } from "next/navigation" 
// import { createClient } from "@/lib/supabase/client"

interface LeadFiltersProps {
  // NOTE: telecallers prop remains, but the check-in status logic is removed for compilation
  telecallers: Array<{ id: string; full_name: string }>
}

/**
 * LeadFilters Component: Manages and applies filters for the leads list.
 * NOTE: The navigation logic is simulated using console logs in this environment
 * to prevent compilation errors related to Next.js hooks (useRouter/useSearchParams).
 * Please replace 'SimulatedRouter' usage with actual 'useRouter' in your Next.js app.
 */
export function LeadFilters({ telecallers }: LeadFiltersProps) {
  // Placeholder for Next.js navigation (to prevent compilation error)
  const SimulatedRouter = () => ({
    push: (url: string) => console.log("Simulated Navigation to:", url),
    // Simulate reading initial params in this environment
    initialSearchParams: new URLSearchParams(typeof window !== 'undefined' ? window.location.search : ''),
  });
  
  const router = SimulatedRouter();
  const searchParams = router.initialSearchParams; // Using simulated search params

  // State initialization from URL search parameters
  const [search, setSearch] = useState(searchParams.get("search") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "all")
  const [priority, setPriority] = useState(searchParams.get("priority") || "all")
  const [assignedTo, setAssignedTo] = useState(searchParams.get("assigned_to") || "all")
  const [source, setSource] = useState(searchParams.get("source") || "all")

  // Date range filters
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "")
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "")
  const [lastCallFrom, setLastCallFrom] = useState(searchParams.get("last_call_from") || "")
  const [lastCallTo, setLastCallTo] = useState(searchParams.get("last_call_to") || "")
  
  // State to hold telecaller check-in status (mocked/empty in this version)
  const [telecallerStatus, setTelecallerStatus] = useState<Record<string, boolean>>({})

  // Mocked Effect: The original Supabase logic is removed to fix the compilation error.
  // In your production code, re-add the useEffect hook to fetch telecaller status.
  useEffect(() => {
    // console.log("Supabase client fetch logic skipped for compilation environment.")
    // Placeholder to satisfy linter, ensuring telecallerStatus is initialized if needed
    if (telecallers.length > 0 && Object.keys(telecallerStatus).length === 0) {
        setTelecallerStatus(
            telecallers.reduce((acc, t) => ({ ...acc, [t.id]: false }), {})
        );
    }
  }, [telecallers, telecallerStatus]) // Adjusted dependencies for the mocked effect

  /**
   * Constructs the URL search parameters based on current state and navigates.
   */
  const applyFilters = () => {
    const params = new URLSearchParams()
    
    // Add primary filters if they have values other than 'all' or empty string
    if (search) params.set("search", search)
    if (status !== "all") params.set("status", status)
    if (priority !== "all") params.set("priority", priority)
    if (assignedTo !== "all") params.set("assigned_to", assignedTo)
    if (source !== "all") params.set("source", source)

    // Add date range filters if they are set
    if (dateFrom) params.set("date_from", dateFrom)
    if (dateTo) params.set("date_to", dateTo)
    if (lastCallFrom) params.set("last_call_from", lastCallFrom)
    if (lastCallTo) params.set("last_call_to", lastCallTo)
    
    // Use simulated router
    router.push(`/admin/leads?${params.toString()}`)
  }

  /**
   * Resets all filter states to their default values and navigates to the base URL.
   */
  const clearFilters = () => {
    setSearch("")
    setStatus("all")
    setPriority("all")
    setAssignedTo("all")
    setSource("all")

    // Clear date filters
    setDateFrom("")
    setDateTo("")
    setLastCallFrom("")
    setLastCallTo("")
    
    // Use simulated router
    router.push("/admin/leads")
  }

  /**
   * Helper function to set predefined date ranges for Lead Creation Date.
   */
  const setQuickDateRange = (days: number) => {
    // Check if we are in a browser environment to safely use Date
    if (typeof window !== 'undefined') {
        const today = new Date().toISOString().split("T")[0]
        // Calculate past date
        const pastDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    
        setDateFrom(pastDate)
        setDateTo(today)
    }
    
    // Clear Last Call Date filters to ensure only one date context is primarily applied
    setLastCallFrom("") 
    setLastCallTo("")
  }

  return (
    <div className="space-y-6 p-4 rounded-lg border bg-white shadow-sm">
      
      {/* Primary Select Filters & Search */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"> 
        
        {/* Search Input */}
        <div className="relative col-span-2 lg:col-span-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 focus-visible:ring-sky-500"
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            aria-label="Search leads by name, phone or email"
          />
        </div>

        {/* Status Filter */}
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="focus:ring-sky-500">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="Interested">Interested</SelectItem>
            <SelectItem value="Documents_Sent">Documents Sent</SelectItem>
            <SelectItem value="Login">Login</SelectItem>
            <SelectItem value="Disbursed">Disbursed</SelectItem>
            <SelectItem value="Not_Interested">Not Interested</SelectItem>
            <SelectItem value="follow_up">Follow Up</SelectItem>
            <SelectItem value="not_eligible">Not Eligible</SelectItem>
            <SelectItem value="nr">No Response (NR)</SelectItem>
            <SelectItem value="self_employed">Self Employed</SelectItem>
          </SelectContent>
        </Select>

        {/* Priority Filter */}
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="focus:ring-sky-500">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        {/* Assigned To Filter */}
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger className="focus:ring-sky-500">
            <SelectValue placeholder="Filter by telecaller" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Telecallers</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {telecallers.map((telecaller) => (
              <SelectItem key={telecaller.id} value={telecaller.id}>
                <div className="flex items-center gap-2">
                  {/* Status indicator for telecaller based on attendance (MOCKED) */}
                  <div 
                    className={`w-2 h-2 rounded-full transition-colors ${telecallerStatus[telecaller.id] ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} 
                    title={telecallerStatus[telecaller.id] ? 'Checked in today (MOCKED)' : 'Not checked in today (MOCKED)'} 
                  />
                  {telecaller.full_name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source Filter */}
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="focus:ring-sky-500">
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="website">Website</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
            <SelectItem value="campaign">Campaign</SelectItem>
            <SelectItem value="cold_call">Cold Call</SelectItem>
            <SelectItem value="manual_entry">Manual Entry</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Filters Section */}
      <div className="pt-6 border-t border-gray-100 space-y-6">
        
        {/* Lead Creation Date Filter */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700">Lead Creation Date</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="date-from" className="text-xs font-medium text-gray-500">Created From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                title="Lead Creation Date From"
                className="focus:ring-sky-500"
              />
            </div>

            <div>
              <Label htmlFor="date-to" className="text-xs font-medium text-gray-500">Created To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                title="Lead Creation Date To"
                className="focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Quick Date Ranges for Lead Creation Date */}
          <div className="flex gap-2 flex-wrap pt-1">
            <Button variant="ghost" size="sm" onClick={() => setQuickDateRange(7)} className="text-sky-600 hover:bg-sky-50/50">
              Last 7 days
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setQuickDateRange(30)} className="text-sky-600 hover:bg-sky-50/50">
              Last 30 days
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setQuickDateRange(90)} className="text-sky-600 hover:bg-sky-50/50">
              Last 90 days
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setQuickDateRange(365)} className="text-sky-600 hover:bg-sky-50/50">
              Last year
            </Button>
          </div>
        </div>

        {/* Last Call Date Filter */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700">Last Call Date</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="last-call-from" className="text-xs font-medium text-gray-500">Last Call From</Label>
              <Input
                id="last-call-from"
                type="date"
                value={lastCallFrom}
                onChange={(e) => setLastCallFrom(e.target.value)}
                title="Last Call Date From"
                className="focus:ring-sky-500"
              />
            </div>

            <div>
              <Label htmlFor="last-call-to" className="text-xs font-medium text-gray-500">Last Call To</Label>
              <Input
                id="last-call-to"
                type="date"
                value={lastCallTo}
                onChange={(e) => setLastCallTo(e.target.value)}
                title="Last Call Date To"
                className="focus:ring-sky-500"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Apply/Clear Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <Button onClick={applyFilters} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 transition-colors">
          <Search className="h-4 w-4" />
          Apply Filters
        </Button>
        <Button 
          variant="outline" 
          onClick={clearFilters} 
          className="flex items-center gap-2 text-gray-600 border-gray-300 hover:bg-gray-50"
        >
          <X className="h-4 w-4" />
          Clear All
        </Button>
      </div>
    </div>
  )
}
