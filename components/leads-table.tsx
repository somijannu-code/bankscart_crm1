"use client";

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  User, Building, Calendar, Clock, Eye, Phone, Mail,
  Search, Filter, ChevronDown, ChevronUp, Download,
  MoreHorizontal, Check, X, AlertCircle, Star,
  TrendingUp, TrendingDown, Activity, MessageSquare,
  FileText, PhoneCall, Send, Tag, Plus, Trash2,
  BarChart3, Users, DollarSign, Target, Zap,
  Layout, Table as TableIcon, Settings, Save,
  AlertTriangle, CheckCircle2, XCircle, Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { LeadStatusDialog } from "@/components/lead-status-dialog"
import { QuickActions } from "@/components/quick-actions"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  // New imports for nested dropdowns
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { useTelecallerStatus } from "@/hooks/use-telecaller-status"
import { Checkbox } from "@/components/ui/checkbox"

// NOTE: Placeholder for a hypothetical MultiSelect component
// You would need to ensure this component is available in your project.
interface MultiSelectProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder: string;
}
const MultiSelect = ({ options, value, onChange, placeholder }: MultiSelectProps) => {
  return (
    <Select
      value={value.join(',')} // Using single select for visual placeholder
      onValueChange={(v) => onChange(v ? [v] : [])} // Mocking multi-select by setting the single selected value
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// --- Interfaces and Types (Assuming these are defined elsewhere or passed as props) ---
interface Telecaller {
  id: string
  full_name: string
}

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  company: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  source: string
  created_at: string
  last_activity_at: string | null
  next_follow_up: string | null
  assigned_to: string | null
  assigned_by: string | null
  assigned_at: string | null
  tags: string[]
  assigned_user: { id: string; full_name: string } | null
}

interface LeadsTableProps {
  initialLeads: Lead[]
  telecallers: Telecaller[]
  fetchLeads: () => Promise<void>
}

// --- Component Start ---

export function LeadsTable({ initialLeads, telecallers, fetchLeads }: LeadsTableProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('created_at')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [sortColumn, setSortColumn] = useState<keyof Lead>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [leadsPerPage, setLeadsPerPage] = useState(10)

  // --- New State for Assignment/Selection ---
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [bulkAssignTo, setBulkAssignTo] = useState<string[]>([]) // For MultiSelect values (telecaller IDs)
  const [assignedToFilter, setAssignedToFilter] = useState<string | 'unassigned' | 'all'>('all')
  const [isBulkAssignLoading, setIsBulkAssignLoading] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isCallInitiated, setIsCallInitiated] = useState(false)
  const [selectedLeadForTags, setSelectedLeadForTags] = useState<Lead | null>(null)
  const [isTagsDialogOpen, setIsTagsDialogOpen] = useState(false)
  const availableTags = ['Hot', 'Warm', 'Cold', 'Follow-up', 'High-Value']
  // --- End New State ---


  // --- New Hook for Status ---
  const { telecallerStatus } = useTelecallerStatus(telecallers.map(t => t.id))

  // Helper for status rendering
  const getTelecallerStatus = (id: string | null) => {
    if (!id) return { status: 'none', Icon: XCircle, color: 'text-gray-500' }
    const statusData = telecallerStatus[id]
    const status = statusData?.checked_in_at && !statusData?.checked_out_at ? 'online' : 'offline'
    return {
      status,
      Icon: status === 'online' ? CheckCircle2 : XCircle,
      color: status === 'online' ? 'text-green-500' : 'text-red-500',
    }
  }

  // --- Assignment Functions ---

  const handleAssignLead = async (leadId: string, telecallerId: string | null) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Authentication required for assignment.")
      return
    }

    const assignedById = user.id

    const { error } = await supabase
      .from('leads')
      .update({
        assigned_to: telecallerId,
        assigned_by: assignedById,
        assigned_at: telecallerId ? new Date().toISOString() : null,
      })
      .eq('id', leadId)

    if (error) {
      console.error('Error assigning lead:', error.message)
      toast.error(`Failed to assign lead: ${error.message}`)
    } else {
      toast.success(telecallerId ? 'Lead assigned successfully!' : 'Lead unassigned successfully!')
      fetchLeads() // Refresh the data in the table
    }
  }

  const handleBulkAssign = async () => {
    if (selectedLeads.size === 0 || bulkAssignTo.length === 0) {
      toast.error("Select leads and at least one telecaller for bulk assignment.")
      return
    }
    setIsBulkAssignLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Authentication required for bulk assignment.")
      setIsBulkAssignLoading(false)
      return
    }
    const assignedById = user.id
    const leadIds = Array.from(selectedLeads)

    const updates = leadIds.map((leadId, index) => {
      // Round-robin logic: Distribute leads among selected telecallers
      const telecallerId = bulkAssignTo[index % bulkAssignTo.length]

      return supabase
        .from('leads')
        .update({
          assigned_to: telecallerId,
          assigned_by: assignedById,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', leadId)
    })

    const results = await Promise.all(updates)
    const errors = results.filter(res => res.error).map(res => res.error)

    if (errors.length > 0) {
      console.error('Bulk assignment errors:', errors)
      toast.error(`Failed to assign ${errors.length} leads.`)
    } else {
      toast.success(`${leadIds.length} leads assigned successfully using round-robin.`)
    }

    // Reset state and refresh
    setSelectedLeads(new Set())
    setBulkAssignTo([])
    setIsBulkAssignLoading(false)
    fetchLeads()
  }

  // --- Lead Selection Handlers ---

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select leads on the current page for practical reasons
      const allIds = new Set(paginatedLeads.map(lead => lead.id))
      setSelectedLeads(allIds)
    } else {
      setSelectedLeads(new Set())
    }
  }

  const handleSelectLead = (leadId: string, checked: boolean) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(leadId)
      } else {
        newSet.delete(leadId)
      }
      return newSet
    })
  }

  // --- Filtering & Sorting (Updated with Assigned To filter) ---

  const allStatuses = useMemo(() => Array.from(new Set(initialLeads.map(l => l.status))), [initialLeads])

  const filteredLeads = useMemo(() => {
    let currentLeads = leads

    // 1. Search Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      currentLeads = currentLeads.filter(
        lead =>
          lead.name.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          lead.phone.toLowerCase().includes(query) ||
          lead.company.toLowerCase().includes(query)
      )
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      currentLeads = currentLeads.filter(lead => lead.status === statusFilter)
    }

    // 3. Priority Filter
    if (priorityFilter !== 'all') {
      currentLeads = currentLeads.filter(lead => lead.priority === priorityFilter)
    }

    // 4. Assigned To Filter (New)
    if (assignedToFilter === 'unassigned') {
      currentLeads = currentLeads.filter(lead => !lead.assigned_to)
    } else if (assignedToFilter !== 'all') {
      currentLeads = currentLeads.filter(lead => lead.assigned_to === assignedToFilter)
    }

    // 5. Date Filter
    if (dateRange.start && dateRange.end) {
      const startDate = new Date(dateRange.start).getTime()
      const endDate = new Date(dateRange.end).getTime()

      currentLeads = currentLeads.filter(lead => {
        const leadDate = new Date(lead[dateFilter as keyof Lead] as string).getTime()
        return leadDate >= startDate && leadDate <= endDate
      })
    }

    // 6. Sorting
    currentLeads.sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]

      if (aValue === null && bValue !== null) return sortDirection === 'asc' ? -1 : 1
      if (aValue !== null && bValue === null) return sortDirection === 'asc' ? 1 : -1
      if (aValue === null && bValue === null) return 0

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return currentLeads
  }, [leads, searchQuery, statusFilter, priorityFilter, dateFilter, dateRange, sortColumn, sortDirection, assignedToFilter])


  // --- Pagination Logic (Unchanged) ---

  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage)
  const startIndex = (currentPage - 1) * leadsPerPage
  const paginatedLeads = filteredLeads.slice(startIndex, startIndex + leadsPerPage)

  useEffect(() => {
    // Reset page when filters change
    setCurrentPage(1)
  }, [searchQuery, statusFilter, priorityFilter, dateFilter, dateRange, leadsPerPage, assignedToFilter])

  // --- Other Handlers (Tags, Dialogs - Unchanged) ---

  const handleSort = (column: keyof Lead) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleStatusUpdate = (leadId: string, newStatus: string) => {
    setLeads(prevLeads =>
      prevLeads.map(lead => (lead.id === leadId ? { ...lead, status: newStatus } : lead))
    )
    setSelectedLead(null)
    setIsStatusDialogOpen(false)
  }

  const handleCallLogged = (leadId: string, timestamp: string) => {
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, last_activity_at: timestamp } : lead
      )
    )
    setIsCallInitiated(false)
  }

  const handleAddTag = async (leadId: string, tag: string) => { /* ... (Existing logic) ... */ }
  const handleRemoveTag = async (leadId: string, tag: string) => { /* ... (Existing logic) ... */ }


  // --- Render Component ---

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[200px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {allStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* New Assigned To Filter Dropdown */}
          <Select
            value={assignedToFilter}
            onValueChange={(value) => setAssignedToFilter(value as 'all' | 'unassigned' | string)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Telecallers</SelectLabel>
                {telecallers.map((telecaller) => {
                  const { Icon, color } = getTelecallerStatus(telecaller.id)
                  return (
                    <SelectItem key={telecaller.id} value={telecaller.id}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-3 w-3 ${color}`} />
                        {telecaller.full_name}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Date Filter Dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange.start && dateRange.end ? `${dateRange.start} - ${dateRange.end}` : "Filter by Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-4 space-y-3">
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Date Field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created At</SelectItem>
                  <SelectItem value="last_activity_at">Last Activity</SelectItem>
                  <SelectItem value="next_follow_up">Next Follow Up</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} />
                <Input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} />
              </div>
              <Button variant="outline" onClick={() => setDateRange({ start: '', end: '' })} className="w-full">Clear Date Filter</Button>
            </PopoverContent>
          </Popover>
        </div>
        <Button variant="default" className="w-full md:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export Leads
        </Button>
      </div>

      {/* Bulk Actions Bar (New) */}
      {selectedLeads.size > 0 && (
        <div className="sticky top-0 z-10 flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-white/90 backdrop-blur-sm border-b shadow-md rounded-lg">
          <span className="text-sm font-medium mb-2 md:mb-0">
            **{selectedLeads.size}** lead{selectedLeads.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-2 md:space-y-0 md:space-x-2 w-full md:w-auto">
            <div className="w-full md:w-[300px]">
              {/* MultiSelect component for selecting multiple telecallers */}
              <MultiSelect
                options={telecallers.map(t => ({ value: t.id, label: t.full_name }))}
                value={bulkAssignTo}
                onChange={setBulkAssignTo}
                placeholder="Select Telecallers for Bulk Assign"
              />
            </div>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssignTo.length === 0 || isBulkAssignLoading}
              className="w-full md:w-auto"
            >
              <Users className="mr-2 h-4 w-4" />
              {isBulkAssignLoading ? 'Assigning...' : 'Bulk Assign'}
            </Button>
            <Button variant="outline" onClick={() => setSelectedLeads(new Set())} className="w-full md:w-auto">
              <X className="mr-2 h-4 w-4" />
              Clear Selection
            </Button>
          </div>
        </div>
      )}
      {/* End Bulk Actions Bar */}

      <div className="relative overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] text-center">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={selectedLeads.size === paginatedLeads.length && paginatedLeads.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={paginatedLeads.length === 0}
                />
              </TableHead>
              <TableHead className="w-[50px] text-center">
                <TableIcon className="h-4 w-4 mx-auto" />
              </TableHead>
              {/* Other Headers */}
              <TableHead
                className="cursor-pointer hover:text-primary transition-colors min-w-[150px]"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Name
                  {sortColumn === 'name' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />)}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-primary transition-colors min-w-[150px]"
                onClick={() => handleSort('phone')}
              >
                <div className="flex items-center">
                  Contact
                  {sortColumn === 'phone' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />)}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-primary transition-colors min-w-[150px]"
                onClick={() => handleSort('company')}
              >
                <div className="flex items-center">
                  Company
                  {sortColumn === 'company' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />)}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-primary transition-colors min-w-[120px]"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {sortColumn === 'status' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />)}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:text-primary transition-colors min-w-[120px]"
                onClick={() => handleSort('priority')}
              >
                <div className="flex items-center">
                  Priority
                  {sortColumn === 'priority' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />)}
                </div>
              </TableHead>

              {/* New Assigned To Header */}
              <TableHead
                className="cursor-pointer hover:text-primary transition-colors min-w-[150px]"
                onClick={() => handleSort('assigned_to')}
              >
                <div className="flex items-center">
                  **Assigned To**
                  {sortColumn === 'assigned_to' && (sortDirection === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />)}
                </div>
              </TableHead>

              <TableHead className="w-[150px] text-center">Tags</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeads.map((lead, index) => (
              <TableRow key={lead.id} className={selectedLeads.has(lead.id) ? 'bg-blue-50/50' : ''}>
                {/* Checkbox Cell */}
                <TableCell className="text-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={selectedLeads.has(lead.id)}
                    onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                  />
                </TableCell>
                <TableCell className="text-center text-sm text-gray-500">
                  {startIndex + index + 1}
                </TableCell>
                {/* Other Cells */}
                <TableCell className="font-medium hover:text-primary">
                  <Link href={`/leads/${lead.id}`} className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    {lead.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 hover:text-primary">
                    <Phone className="h-4 w-4 text-gray-500" />
                    {lead.phone}
                  </a>
                </TableCell>
                <TableCell className="text-sm">{lead.company}</TableCell>
                <TableCell>
                  <Badge variant="default">{lead.status}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={lead.priority === 'critical' ? 'destructive' : lead.priority === 'high' ? 'secondary' : 'default'}>
                    {lead.priority}
                  </Badge>
                </TableCell>

                {/* New Assigned To Cell */}
                <TableCell>
                  {lead.assigned_user ? (
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`h-2 w-2 rounded-full ${getTelecallerStatus(lead.assigned_user.id).color === 'text-green-500' ? 'bg-green-500' : 'bg-red-500'}`} />
                      {lead.assigned_user.full_name}
                    </div>
                  ) : (
                    <span className="text-gray-500 italic text-sm">Unassigned</span>
                  )}
                </TableCell>

                <TableCell className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedLeadForTags(lead)
                      setIsTagsDialogOpen(true)
                    }}
                  >
                    <Tag className="h-4 w-4 mr-1" /> {lead.tags.length || 0}
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <QuickActions lead={lead} onStatusChange={() => {
                      setSelectedLead(lead)
                      setIsStatusDialogOpen(true)
                      setIsCallInitiated(true)
                    }} />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => {
                          setSelectedLead(lead)
                          setIsStatusDialogOpen(true)
                          setIsCallInitiated(false)
                        }}>
                          <Activity className="mr-2 h-4 w-4" />
                          <span>Update Status</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => alert(`Viewing history for ${lead.name}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          <span>View History</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />

                        {/* New Assign To Submenu */}
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Users className="mr-2 h-4 w-4" />
                            <span>**Assign To**</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem
                                onClick={() => handleAssignLead(lead.id, null)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                <span>Unassign Lead</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Telecallers</DropdownMenuLabel>
                              {telecallers.map((telecaller) => {
                                const { Icon, color } = getTelecallerStatus(telecaller.id)
                                return (
                                  <DropdownMenuItem
                                    key={telecaller.id}
                                    onClick={() => handleAssignLead(lead.id, telecaller.id)}
                                    className={lead.assigned_to === telecaller.id ? 'font-semibold bg-gray-100 dark:bg-gray-800' : ''}
                                  >
                                    <Icon className={`mr-2 h-4 w-4 ${color}`} />
                                    <span>{telecaller.full_name}</span>
                                    {lead.assigned_to === telecaller.id && <Check className="ml-auto h-4 w-4 text-green-500" />}
                                  </DropdownMenuItem>
                                )
                              })}
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        {/* End Assign To Submenu */}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete Lead</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination (Unchanged) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Rows per page:</span>
          <Select
            value={String(leadsPerPage)}
            onValueChange={(value) => setLeadsPerPage(Number(value))}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages} ({filteredLeads.length} leads)
          </span>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = i + 1
                if (totalPages > 5) {
                  if (currentPage > 3 && currentPage < totalPages - 1) {
                    pageNum = currentPage - 2 + i
                  } else if (currentPage >= totalPages - 1) {
                    pageNum = totalPages - 4 + i
                  }
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {leads.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No leads found. Try adjusting your filters or upload some leads.
        </div>
      )}
      
      {selectedLead && (
        <LeadStatusDialog
          leadId={selectedLead.id}
          currentStatus={selectedLead.status}
          open={isStatusDialogOpen}
          onOpenChange={(open) => {
            setIsStatusDialogOpen(open)
            if (!open) setIsCallInitiated(false) // Reset when dialog is closed
          }}
          onStatusUpdate={handleStatusUpdate}
          isCallInitiated={isCallInitiated}
          onCallLogged={handleCallLogged}
        />
      )}
      
      {/* Tag Dialog (Unchanged) */}
      <Dialog open={isTagsDialogOpen} onOpenChange={setIsTagsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              Add or remove tags for lead **{selectedLeadForTags?.name}**.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Current Tags</Label>
              <div className="flex flex-wrap gap-2">
                {(selectedLeadForTags?.tags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => handleRemoveTag(selectedLeadForTags!.id, tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Add Tag</Label>
              <div className="flex gap-2">
                <Select onValueChange={(value) => handleAddTag(selectedLeadForTags!.id, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags
                      .filter(t => !(selectedLeadForTags?.tags || []).includes(t))
                      .map((tag) => (
                        <SelectItem key={tag} value={tag}>
                          {tag}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
