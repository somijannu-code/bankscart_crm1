"use client";

// 🔑 FIX 1: Import useMemo from React
import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { 
  User, Building, Calendar, Clock, Eye, Phone, Mail, 
  Search, Filter, ChevronDown, ChevronUp, Download, // Download icon imported for export
  MoreHorizontal, Check, X, AlertCircle, Trash2 // Trash2 icon imported for delete
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
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTelecallerStatus } from "@/hooks/use-telecaller-status"
import { format } from "date-fns"; 
// IMPORTANT: You need to import a multi-select component here.
// For example: import { MultiSelect } from "@/components/ui/multi-select"; 

interface User {
  id: string
  full_name: string
  // ... other user fields
}

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  status: string
  priority: string
  assigned_user: { id: string; full_name: string } | null
  assigner: { id: string; full_name: string } | null
  created_at: string
}

interface LeadsTableProps {
  leads: Lead[]
  totalLeads: number
  telecallers: User[] // The unstable prop coming from the server component
  searchParams: any
  onStatusUpdate: () => void
  onCallLogged: () => void
}

export function LeadsTable({ leads: initialLeads, totalLeads, telecallers, searchParams, onStatusUpdate, onCallLogged }: LeadsTableProps) {
  const supabase = createClient()
  const [leads, setLeads] = useState(initialLeads)
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.page || "1"))
  const [limit, setLimit] = useState(parseInt(searchParams.limit || "100"))
  const [isLoading, setIsLoading] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isCallInitiated, setIsCallInitiated] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
    name: true,
    email: true,
    phone: true,
    status: true,
    priority: true,
    assigned_to: true,
    created_at: false,
    actions: true,
  })

  // 🔑 FIX 2: Stabilize the array reference using useMemo
  const telecallerIds = useMemo(() => {
    // This calculation only runs when the 'telecallers' prop changes.
    return telecallers.map(t => t.id)
  }, [telecallers]) // Depend on the source data (telecallers prop)

  // The hook call is now safe, as its dependency (telecallerIds) is stable.
  const { telecallerStatus } = useTelecallerStatus(telecallerIds)

  const totalPages = Math.ceil(totalLeads / limit)
  const maxPagesToShow = 5

  const handleStatusUpdate = (updatedLead: Lead) => {
    setLeads(prevLeads => prevLeads.map(lead => 
      lead.id === updatedLead.id ? updatedLead : lead
    ))
    onStatusUpdate() 
  }

  const handleCallLogged = () => {
    onCallLogged() 
  }

  // Utility to determine badge appearance based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New': return <Badge variant="default" className="bg-blue-100 text-blue-600 hover:bg-blue-100">New</Badge>
      case 'Contacted': return <Badge variant="default" className="bg-yellow-100 text-yellow-600 hover:bg-yellow-100">Contacted</Badge>
      case 'Qualified': return <Badge variant="default" className="bg-green-100 text-green-600 hover:bg-green-100">Qualified</Badge>
      case 'Lost': return <Badge variant="default" className="bg-red-100 text-red-600 hover:bg-red-100">Lost</Badge>
      case 'Dead': return <Badge variant="default" className="bg-gray-100 text-gray-600 hover:bg-gray-100">Dead</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }
  
  // Utility to determine priority badge appearance
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'High': return <Badge variant="destructive">High</Badge>
      case 'Medium': return <Badge variant="outline" className="text-orange-500 border-orange-500">Medium</Badge>
      case 'Low': return <Badge variant="outline" className="text-gray-500 border-gray-300">Low</Badge>
      default: return <Badge variant="secondary">{priority}</Badge>
    }
  }

  // Column Headers
  const columns = [
    { key: 'name', name: 'Name' },
    { key: 'email', name: 'Email' },
    { key: 'phone', name: 'Phone' },
    { key: 'status', name: 'Status' },
    { key: 'priority', name: 'Priority' },
    { key: 'assigned_to', name: 'Assigned To' },
    { key: 'created_at', name: 'Created' },
    { key: 'actions', name: 'Actions' },
  ]
  
  // Omitted sorting and filtering logic for brevity
  // ... useEffect logic for fetching leads based on pagination/filters (Omitted for brevity)
  useEffect(() => {
    // Logic to update leads based on currentPage, limit, and searchParams
    // This part is client-side state management for pagination/search
    // The actual lead fetching is likely handled in the server component (page (15).tsx)
  }, [currentPage, limit, searchParams])


  return (
    <div className="space-y-4">
      
      {/* Table Display */}
      <div className="border rounded-md overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              {columns.filter(col => columnVisibility[col.key]).map((column) => (
                <TableHead key={column.key}>{column.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const assignedUserId = lead.assigned_user?.id
              const isAvailable = assignedUserId ? telecallerStatus[assignedUserId] : false
              
              return (
                <TableRow key={lead.id} className="hover:bg-gray-50">
                  {columnVisibility.name && <TableCell className="font-medium text-blue-600 hover:underline"><Link href={`/leads/${lead.id}`}>{lead.name}</Link></TableCell>}
                  {columnVisibility.email && <TableCell>{lead.email}</TableCell>}
                  {columnVisibility.phone && <TableCell>{lead.phone}</TableCell>}
                  {columnVisibility.status && <TableCell>{getStatusBadge(lead.status)}</TableCell>}
                  {columnVisibility.priority && <TableCell>{getPriorityBadge(lead.priority)}</TableCell>}
                  
                  {columnVisibility.assigned_to && (
                    <TableCell>
                      {lead.assigned_user ? (
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                          {lead.assigned_user.full_name}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">Unassigned</span>
                      )}
                    </TableCell>
                  )}
                  
                  {columnVisibility.created_at && <TableCell>{format(new Date(lead.created_at), 'MMM dd, yyyy')}</TableCell>}
                  
                  {columnVisibility.actions && (
                    <TableCell className="w-20">
                      <QuickActions 
                        lead={lead}
                        onCallInitiate={() => {
                          setSelectedLead(lead)
                          setIsStatusDialogOpen(true)
                          setIsCallInitiated(true)
                        }}
                      />
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination (Logic for a full copy-paste file) */}
      {leads.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * limit + 1} to {Math.min(currentPage * limit, totalLeads)} of {totalLeads} leads
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(
                  Math.max(0, currentPage - Math.ceil(maxPagesToShow / 2)),
                  Math.min(totalPages, currentPage + Math.floor(maxPagesToShow / 2))
                )
                .map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                ))}
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
      )}

      {leads.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No leads found. Try adjusting your filters or upload some leads.
        </div>
      )}

      {/* Dialogs */}
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
    </div>
  )
}
