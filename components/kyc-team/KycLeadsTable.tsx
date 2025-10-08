"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { 
  Search, Filter, ChevronDown, ChevronUp, MoreHorizontal, 
  Loader2, RefreshCw, Eye, Hash, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";

// CRITICAL CHANGE: Only including columns you confirmed are available
interface Lead {
  id: string;
  name: string; // Using 'name'
  kyc_member_id: string; // Required for filtering/realtime checks
  // Status, phone, loan_amount, created_at removed to prevent crashes
}

interface KycLeadsTableProps {
    currentUserId: string;
}

// Since status is missing, we use a generic badge
const getStatusBadge = () => {
  return <Badge variant="secondary" className="bg-gray-400 text-white hover:bg-gray-500">Assigned</Badge>;
};

const PAGE_SIZE = 10;

export default function KycLeadsTable({ currentUserId }: KycLeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  // Status filter and sort config removed as required columns are missing

  const supabase = createClient();

  // 1. Data Fetching function
  const fetchLeads = async (setLoading = false) => {
    if (setLoading) setIsLoading(true);
    
    // Fetch leads assigned to the current KYC member, only selecting existing columns
    const { data, error } = await supabase
      .from("leads")
      .select("id, name, kyc_member_id") // CRITICAL: Only selecting 'id', 'name', 'kyc_member_id'
      .eq("kyc_member_id", currentUserId)
      .limit(1000); 

    if (error) {
      console.error("Error fetching leads:", error);
    } else {
      setLeads(data as Lead[]);
    }
    if (setLoading) setIsLoading(false);
  };

  // 2. Real-time Listener and Initial Load
  useEffect(() => {
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
  }, [currentUserId]); 

  // 3. Filtering Logic (Only by Search Term)
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
    // No status/sort filtering possible due to missing columns

    return filtered;
  }, [leads, searchTerm]);

  // 4. Pagination calculation
  const paginatedLeads = useMemo(() => {
    // Note: We cannot sort the data here as we are missing 'created_at'.
    const start = 0; // Removing pagination controls for now as we have no way to sort
    const end = filteredLeads.length;
    return filteredLeads.slice(start, end);
  }, [filteredLeads]);

  // Removing totalPages and page change handlers

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
        <div className="flex gap-4">
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
                      <Link href={`/kyc-team/${lead.id}`}>{lead.name}</Link> {/* CRITICAL: Using 'name' */}
                    </TableCell>
                    <TableCell>{getStatusBadge()}</TableCell>
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
      
      {/* Pagination removed due to missing 'created_at' for reliable sorting/ordering */}
      <div className="text-center py-2 text-sm text-gray-600">
        Displaying {paginatedLeads.length} leads.
      </div>
    </div>
  );
}
