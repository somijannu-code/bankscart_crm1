// components/telecaller-leads-table.tsx
"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { 
  User, Building, Calendar, Clock, Eye, Phone, Mail, 
  Search, Filter, ChevronDown, ChevronUp, Download,
  AlertCircle, RefreshCw, BarChart3, Zap, Smartphone,
  FileText, MessageSquare, Bell, X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { LeadStatusDialog } from "@/components/lead-status-dialog"
import { QuickActions } from "@/components/quick-actions"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import Link from "next/link"

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  company: string
  status: string
  priority: string
  created_at: string
  last_contacted: string | null
  loan_amount: number | null
  loan_type: string | null
  source: string | null
  assignee_id: string | null
  city: string | null
  follow_up_date: string | null
}

interface TelecallerLeadsTableProps {
  initialLeads?: Lead[]
  totalCount?: number
  currentPage?: number
  pageSize?: number
  userId?: string // Add userId prop
}

// Custom hook for debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function TelecallerLeadsTable({ 
  initialLeads = [], 
  totalCount = 0, 
  currentPage = 1, 
  pageSize = 20,
  userId // Receive userId prop
}: TelecallerLeadsTableProps) {
  // Safe initialization with proper defaults
  const [leads, setLeads] = useState<Lead[]>(Array.isArray(initialLeads) ? initialLeads : [])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [cityFilter, setCityFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | null>(null)
  const [loanAmountRange, setLoanAmountRange] = useState<{ min: number; max: number } | null>(null)
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    name: true,
    contact: true,
    company: true,
    status: true,
    priority: true,
    created: true,
    lastContacted: true,
    loanAmount: true,
    loanType: true,
    source: true,
    actions: true
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMobileView, setIsMobileView] = useState(false)
  const [analytics, setAnalytics] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("all")
  const [appliedFilters, setAppliedFilters] = useState<string[]>([])
  const [totalLeadsCount, setTotalLeadsCount] = useState(totalCount)

  const supabase = createClient()
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Calculate totalPages safely
  const totalPages = useMemo(() => {
    const safeTotalCount = totalLeadsCount || 0
    const safePageSize = pageSize || 20
    return Math.ceil(safeTotalCount / safePageSize)
  }, [totalLeadsCount, pageSize])

  // Fetch leads data when component mounts or filters change
  useEffect(() => {
    fetchLeads()
  }, [userId, currentPage, debouncedSearchTerm, statusFilter, priorityFilter, activeTab])

  // Function to fetch leads from Supabase
  const fetchLeads = async () => {
    if (!userId) {
      console.warn("No userId provided, cannot fetch leads")
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      // Build the query
      let query = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("assigned_to", userId) // Use the userId prop

      // Apply search filter
      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%,phone.ilike.%${debouncedSearchTerm}%,company.ilike.%${debouncedSearchTerm}%`)
      }

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      // Apply priority filter
      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter)
      }

      // Apply tab filters
      if (activeTab === "new") {
        query = query.eq("status", "new")
      } else if (activeTab === "follow_up") {
        query = query.not("follow_up_date", "is", null)
      } else if (activeTab === "high_priority") {
        query = query.eq("priority", "high")
      }

      // Apply sorting
      if (sortField) {
        query = query.order(sortField, { ascending: sortDirection === "asc" })
      } else {
        query = query.order("created_at", { ascending: false })
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        throw error
      }

      console.log('Fetched leads:', data?.length, 'Total count:', count)

      setLeads(data || [])
      setTotalLeadsCount(count || 0)

    } catch (err) {
      console.error("Error fetching leads:", err)
      setError("Failed to load leads. Please try again.")
      
      // Fallback to initialLeads if available
      if (initialLeads && initialLeads.length > 0) {
        setLeads(initialLeads)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Update leads when initialLeads changes
  useEffect(() => {
    if (Array.isArray(initialLeads) && initialLeads.length > 0 && leads.length === 0) {
      setLeads(initialLeads)
    }
  }, [initialLeads])

  // Mobile responsiveness
  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load analytics safely
  useEffect(() => {
    loadAnalytics()
  }, [leads])

  const loadAnalytics = async () => {
    try {
      // Calculate analytics from current leads
      const totalLeads = leads.length
      const convertedLeads = leads.filter(lead => 
        ['Interested', 'Documents_Sent', 'Login', 'Disbursed'].includes(lead.status)
      ).length
      const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0
      const pendingFollowups = leads.filter(lead => lead.status === 'Call_Back' || lead.follow_up_date).length

      setAnalytics({
        conversion_rate: conversionRate,
        total_leads: totalLeads,
        pending_followups: pendingFollowups,
        avg_response_time: 2 // Default value
      })
    } catch (err) {
      console.error('Error loading analytics:', err)
      // Set default analytics
      setAnalytics({
        conversion_rate: 0,
        total_leads: leads.length,
        pending_followups: 0,
        avg_response_time: 0
      })
    }
  }

  // Safe value getter with memoization
  const getSafeValue = useCallback((value: any, defaultValue: string = 'N/A') => {
    if (value === null || value === undefined || value === '') {
      return defaultValue
    }
    return value
  }, [])

  // Track applied filters
  useEffect(() => {
    const filters = []
    if (statusFilter !== "all") filters.push(`Status: ${statusFilter}`)
    if (priorityFilter !== "all") filters.push(`Priority: ${priorityFilter}`)
    if (sourceFilter !== "all") filters.push(`Source: ${sourceFilter}`)
    if (cityFilter !== "all") filters.push(`City: ${cityFilter}`)
    if (dateRange) filters.push(`Date Range: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`)
    if (loanAmountRange) filters.push(`Loan: ${loanAmountRange.min} - ${loanAmountRange.max}`)
    if (searchTerm) filters.push(`Search: "${searchTerm}"`)
    if (activeTab !== "all") filters.push(`Tab: ${activeTab.replace('_', ' ')}`)

    setAppliedFilters(filters)
  }, [statusFilter, priorityFilter, sourceFilter, cityFilter, dateRange, loanAmountRange, searchTerm, activeTab])

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setSourceFilter("all")
    setCityFilter("all")
    setDateRange(null)
    setLoanAmountRange(null)
    setActiveTab("all")
  }

  // Handle refresh
  const handleRefresh = () => {
    fetchLeads()
  }

  // Advanced filtering with memoization and safe data handling
  const filteredLeads = useMemo(() => {
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return []
    }

    console.log('Filtering leads:', leads.length, 'with filters:', {
      searchTerm: debouncedSearchTerm,
      statusFilter,
      priorityFilter,
      activeTab
    })

    const filtered = leads.filter(lead => {
      if (!lead) return false

      // Search filter
      const matchesSearch = debouncedSearchTerm === "" || 
        (lead.name && lead.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (lead.email && lead.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
        (lead.phone && lead.phone.includes(debouncedSearchTerm)) ||
        (lead.company && lead.company.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      
      // Status filter
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter
      
      // Priority filter
      const matchesPriority = priorityFilter === "all" || lead.priority === priorityFilter
      
      // Source filter
      const matchesSource = sourceFilter === "all" || lead.source === sourceFilter
      
      // City filter
      const matchesCity = cityFilter === "all" || lead.city === cityFilter
      
      // Date range filter
      const matchesDateRange = !dateRange || (
        lead.created_at &&
        new Date(lead.created_at) >= dateRange.from &&
        new Date(lead.created_at) <= dateRange.to
      )
      
      // Loan amount filter
      const matchesLoanAmount = !loanAmountRange || (
        lead.loan_amount && 
        lead.loan_amount >= loanAmountRange.min && 
        lead.loan_amount <= loanAmountRange.max
      )

      // Tab filter
      const matchesTab = activeTab === "all" || 
        (activeTab === "follow_up" && lead.follow_up_date) ||
        (activeTab === "high_priority" && lead.priority === "high") ||
        (activeTab === "new" && lead.status === "new")
      
      return matchesSearch && matchesStatus && matchesPriority && 
             matchesSource && matchesCity && matchesDateRange && 
             matchesLoanAmount && matchesTab
    })

    console.log('Filtered leads count:', filtered.length)

    // Sort the filtered results
    return filtered.sort((a, b) => {
      let aValue = a[sortField as keyof Lead]
      let bValue = b[sortField as keyof Lead]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }
      
      if (aValue === null || aValue === undefined) return sortDirection === 'asc' ? -1 : 1
      if (bValue === null || bValue === undefined) return sortDirection === 'asc' ? 1 : -1
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [leads, debouncedSearchTerm, statusFilter, priorityFilter, sourceFilter, cityFilter, dateRange, loanAmountRange, sortField, sortDirection, activeTab])

  // Performance optimized sort handler
  const handleSort = useCallback((field: string) => {
    setSortField(field)
    setSortDirection(prev => prev === 'asc' && sortField === field ? 'desc' : 'asc')
  }, [sortField])

  // Enhanced status update with proper state management
  const handleStatusUpdate = async (newStatus: string, note?: string, callbackDate?: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      if (!selectedLead?.id) {
        throw new Error("No lead selected")
      }
      
      const updateData: any = { 
        status: newStatus,
        last_contacted: new Date().toISOString()
      }

      // Add note if provided for Not Eligible status
      if (newStatus === "not_eligible" && note) {
        const { error: noteError } = await supabase
          .from("notes")
          .insert({
            lead_id: selectedLead.id,
            note: note,
            note_type: "status_change"
          })

        if (noteError) throw noteError
      }

      // Calendar integration for follow-ups
      if (newStatus === "follow_up" && callbackDate) {
        const { error: followUpError } = await supabase
          .from("follow_ups")
          .insert({
            lead_id: selectedLead.id,
            scheduled_date: callbackDate,
            status: "scheduled"
          })

        if (followUpError) throw followUpError
        
        // Update the lead's follow_up_date
        updateData.follow_up_date = callbackDate
      }

      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .eq("id", selectedLead.id)

      if (error) throw error

      // Refresh the leads data after update
      await fetchLeads()

      // Show success message
      console.log(`Status updated to ${newStatus}`)
      
      setIsStatusDialogOpen(false)
      
    } catch (error) {
      console.error("Error updating lead status:", error)
      setError("Failed to update lead status")
    } finally {
      setIsLoading(false)
    }
  }

  // Helper functions
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "high": return "destructive"
      case "medium": return "default"
      case "low": return "secondary"
      default: return "secondary"
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-yellow-100 text-yellow-800",
      Interested: "bg-green-100 text-green-800",
      Documents_Sent: "bg-purple-100 text-purple-800",
      Login: "bg-orange-100 text-orange-800",
      Disbursed: "bg-green-100 text-green-800",
      Not_Interested: "bg-red-100 text-red-800",
      Call_Back: "bg-indigo-100 text-indigo-800",
      not_eligible: "bg-red-100 text-red-800",
      nr: "bg-gray-100 text-gray-800",
      self_employed: "bg-amber-100 text-amber-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleCallInitiated = (lead: Lead) => {
    setSelectedLead(lead)
    setIsStatusDialogOpen(true)
  }

  // Safe data checks
  const safeLeads = Array.isArray(leads) ? leads : []
  const safeFilteredLeads = Array.isArray(filteredLeads) ? filteredLeads : []
  const displayLeads = safeFilteredLeads.length > 0 ? safeFilteredLeads : safeLeads

  console.log('Render state:', {
    initialLeads: initialLeads?.length,
    leads: safeLeads.length,
    filteredLeads: safeFilteredLeads.length,
    displayLeads: displayLeads.length,
    totalLeadsCount
  })

  // Error boundary fallback UI
  if (error && safeLeads.length === 0) {
    return (
      <div className="text-center py-8 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-semibold">Failed to load leads</h3>
        <p className="text-gray-500">{error}</p>
        <Button onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with lead count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Assigned Leads ({totalLeadsCount})</h2>
          <p className="text-gray-600 mt-1">Manage and follow up with your assigned leads</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Create Lead
          </Button>
        </div>
      </div>

      ) : displayLeads.length === 0 ? (
        // No results after filtering
        <div className="text-center py-12 space-y-6">
          <Search className="h-16 w-16 text-gray-400 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">No matching leads found</h3>
            <p className="text-gray-500 mb-4">Try adjusting your filters or search terms</p>
          </div>
          <Button variant="outline" onClick={clearAllFilters}>
            Clear all filters
          </Button>
        </div>
      ) : isMobileView ? (
        /* Mobile Card View */
        <div className="space-y-4">
          {displayLeads.slice(0, 50).map((lead) => ( // Limit for mobile performance
            <Card key={lead.id} className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {getSafeValue(lead.name)}
                    </h3>
                    <p className="text-sm text-gray-500">{getSafeValue(lead.company)}</p>
                  </div>
                  <Badge className={getStatusColor(lead.status)}>
                    {getSafeValue(lead.status).replace("_", " ")}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{getSafeValue(lead.phone)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <QuickActions
                    phone={getSafeValue(lead.phone, '')}
                    email={getSafeValue(lead.email, '')}
                    leadId={lead.id}
                    onCallInitiated={() => handleCallInitiated(lead)}
                    compact
                  />
                  <Link href={`/telecaller/leads/${lead.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Desktop Table View */
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.name && (
                  <TableHead 
                    className="cursor-pointer" 
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Name 
                      {sortField === 'name' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.contact && <TableHead>Contact</TableHead>}
                {visibleColumns.company && (
                  <TableHead 
                    className="cursor-pointer" 
                    onClick={() => handleSort('company')}
                  >
                    <div className="flex items-center gap-1">
                      Company
                      {sortField === 'company' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.status && <TableHead>Status</TableHead>}
                {visibleColumns.priority && <TableHead>Priority</TableHead>}
                {visibleColumns.loanAmount && (
                  <TableHead 
                    className="cursor-pointer" 
                    onClick={() => handleSort('loan_amount')}
                  >
                    <div className="flex items-center gap-1">
                      Loan Amount
                      {sortField === 'loan_amount' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.loanType && <TableHead>Loan Type</TableHead>}
                {visibleColumns.source && <TableHead>Source</TableHead>}
                {visibleColumns.created && (
                  <TableHead 
                    className="cursor-pointer" 
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {sortField === 'created_at' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.lastContacted && (
                  <TableHead 
                    className="cursor-pointer" 
                    onClick={() => handleSort('last_contacted')}
                  >
                    <div className="flex items-center gap-1">
                      Last Contacted
                      {sortField === 'last_contacted' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                )}
                {visibleColumns.actions && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayLeads.map((lead) => (
                <TableRow key={lead.id} className="hover:bg-gray-50/50">
                  {visibleColumns.name && (
                    <TableCell className="font-medium">
                      <Link href={`/telecaller/leads/${lead.id}`} className="flex items-center gap-2 hover:text-blue-600">
                        <User className="h-4 w-4" />
                        {getSafeValue(lead.name)}
                      </Link>
                    </TableCell>
                  )}
                  {visibleColumns.contact && (
                    <TableCell>
                      <QuickActions
                        phone={getSafeValue(lead.phone, '')}
                        email={getSafeValue(lead.email, '')}
                        leadId={lead.id}
                        onCallInitiated={() => handleCallInitiated(lead)}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.company && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {getSafeValue(lead.company)}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.status && (
                    <TableCell>
                      <Badge className={getStatusColor(lead.status)}>
                        {getSafeValue(lead.status).replace("_", " ")}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.priority && (
                    <TableCell>
                      <Badge variant={getPriorityVariant(getSafeValue(lead.priority, 'medium'))}>
                        {getSafeValue(lead.priority).toUpperCase()}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.loanAmount && (
                    <TableCell>
                      {formatCurrency(lead.loan_amount)}
                    </TableCell>
                  )}
                  {visibleColumns.loanType && (
                    <TableCell>
                      {getSafeValue(lead.loan_type)}
                    </TableCell>
                  )}
                  {visibleColumns.source && (
                    <TableCell>
                      {getSafeValue(lead.source)}
                    </TableCell>
                  )}
                  {visibleColumns.created && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.lastContacted && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {lead.last_contacted
                          ? new Date(lead.last_contacted).toLocaleDateString()
                          : "Never"}
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.actions && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/telecaller/leads/${lead.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedLead(lead)
                            setIsStatusDialogOpen(true)
                          }}
                        >
                          <Zap className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && displayLeads.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-500">
            Showing {Math.min(pageSize, displayLeads.length)} of {displayLeads.length} leads
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href={currentPage > 1 ? `?page=${currentPage - 1}` : '#'}
                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink 
                      href={`?page=${pageNum}`}
                      isActive={currentPage === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              
              <PaginationItem>
                <PaginationNext 
                  href={currentPage < totalPages ? `?page=${currentPage + 1}` : '#'}
                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Status Update Dialog */}
      {selectedLead && (
        <LeadStatusDialog
          leadId={selectedLead.id}
          currentStatus={selectedLead.status}
          open={isStatusDialogOpen}
          onOpenChange={(open) => {
            setIsStatusDialogOpen(open)
            if (!open) setSelectedLead(null)
          }}
          onStatusUpdate={handleStatusUpdate}
          onCallLogged={() => {}} // Add your call logging logic
        />
      )}
    </div>
  )
}
