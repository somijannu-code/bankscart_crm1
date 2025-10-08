"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { 
  Search, Filter, ChevronDown, ChevronUp, MoreHorizontal, 
  Loader2, RefreshCw, Eye, Hash, Users, Clock, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";

// CRITICAL CHANGE: Status is now included
interface Lead {
  id: string;
  name: string;
  kyc_member_id: string;
  status: string; // Assuming 'status' column is available
}

interface KycLeadsTableProps {
    currentUserId: string;
}

// Define the available statuses for consistency
const STATUSES = {
    LOGIN_DONE: "Login Done",
    UNDERWRITING: "Underwriting",
    REJECTED: "Rejected",
    APPROVED: "Approved",
    DISBURSED: "Disbursed",
} as const;

// Utility function to get the appropriate badge based on status
const getStatusBadge = (status: string) => {
    switch (status) {
        case STATUSES.LOGIN_DONE:
            return <Badge variant="secondary" className="bg-blue-400 text-white hover:bg-blue-500"><Clock className="h-3 w-3 mr-1" /> Login Done</Badge>;
        case STATUSES.UNDERWRITING:
            return <Badge variant="secondary" className="bg-amber-500 text-white hover:bg-amber-600"><Clock className="h-3 w-3 mr-1" /> Underwriting</Badge>;
        case STATUSES.REJECTED:
            return <Badge variant="secondary" className="bg-red-600 text-white hover:bg-red-700"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
        case STATUSES.APPROVED:
            return <Badge variant="secondary" className="bg-green-600 text-white hover:bg-green-700"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
        case STATUSES.DISBURSED:
            return <Badge variant="secondary" className="bg-purple-600 text-white hover:bg-purple-700"><CheckCircle className="h-3 w-3 mr-1" /> Disbursed</Badge>;
        default:
            return <Badge variant="secondary">Unknown</Badge>;
    }
};

const PAGE_SIZE = 10;

export default function KycLeadsTable({ currentUserId }: KycLeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // New state for status filtering

  const supabase = createClient();

  // 1. Data Fetching function
  const fetchLeads = async (setLoading = false) => {
    if (setLoading) setIsLoading(true);
    
    let query = supabase
      .from("leads")
      .select("id, name, kyc_member_id, status") // CRITICAL: Now selecting 'status'
      .eq("kyc_member_id", currentUserId)
      .limit(1000); 

    // Apply status filter to the database query
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching leads:", error);
    } else {
      setLeads(data as Lead[]);
    }
    if (setLoading) setIsLoading(false);
  };

  // 2. Real-time Listener and Initial Load
  useEffect(() => {
    // Re-fetch data whenever the status filter changes
    fetchLeads(true); 

    const channel = supabase.channel(`kyc_leads_user_${currentUserId}`);

    const subscription = channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          const changedLead = payload.new as Lead | null;
          const oldLead = payload.old as Lead | null;
          
          const isRelevant = 
             changedLead?.kyc_member_id === currentUserId || 
             oldLead?.kyc_member_id === currentUserId; 

          if (isRelevant) {
             console.log("Relevant lead change detected. Refetching leads...");
             fetchLeads(false); 
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to KYC leads changes for user: ${currentUserId}`);
        }
      });

    return () => {
        supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, statusFilter]); // Added statusFilter to dependency array

  // 3. Filtering Logic (Only by Search Term, status is handled in fetchLeads)
  const filteredLeads = useMemo(() => {
    let filtered = leads;

    // A. Filtering by Search Term
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      // Only search against the 'name' column
      filtered = filtered.filter(
        (lead) => lead.name.toLowerCase().includes(lowerCaseSearch)
      );
    }
    // Note: No client-side status filtering needed as it's done in the fetchLeads query
    
    return filtered;
  }, [leads, searchTerm]);

  // 4. Pagination calculation (simplified, showing all results)
  const paginatedLeads = useMemo(() => {
    const start = 0; 
    const end = filteredLeads.length;
    return filteredLeads.slice(start, end);
  }, [filteredLeads]);


  return (
    <div className="space-y-4">
      {/* Controls: Search, Filter, Refresh */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex items-center space-x-2 w-full sm:w-1/2">
          <Search className="h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by Lead Name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
            }}
            className="w-full"
          />
        </div>
        <div className="flex gap-4 items-center">
            {/* New Status Filter Select */}
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger className="w-[180px] text-sm">
                    <Filter className="h-4 w-4 mr-2 text-gray-500" />
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.values(STATUSES).map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

          <Button onClick={() => fetchLeads(true)} variant="outline" size="icon" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Leads Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-1/4">
                  Lead Name
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Lead ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-gray-600">Loading leads...</p>
                  </TableCell>
                </TableRow>
              ) : paginatedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                    <Users className="w-6 h-6 mx-auto mb-2"/>
                    No assigned leads found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium text-primary hover:underline w-1/4">
                      <Link href={`/kyc-team/${lead.id}`}>{lead.name}</Link>
                    </TableCell>
                    <TableCell>{getStatusBadge(lead.status)}</TableCell>
                    <TableCell className="hidden md:table-cell flex items-center gap-1">
                        <Hash className="h-4 w-4 text-gray-500" />
                        {lead.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/kyc-team/${lead.id}`} className="flex items-center">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      <div className="text-center py-2 text-sm text-gray-600">
        Displaying {paginatedLeads.length} leads.
      </div>
    </div>
  );
}
