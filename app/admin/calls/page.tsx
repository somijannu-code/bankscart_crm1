// This file runs entirely on the server to fetch data efficiently.

import { createClient } from "@/lib/supabase/server";
// Import UI components used in your other files
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; 
import { Users, BarChart3 } from "lucide-react";


// --- Data Structures ---

// Define a common set of lead statuses for consistent column headers.
// These should match the values in your Supabase 'status' column.
const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Interested",
  "Follow Up",
  "Closed/Converted",
  "Not Interested",
  "Junk",
];

interface TelecallerSummary {
  telecallerId: string;
  telecallerName: string;
  statusCounts: { [status: string]: number };
  totalLeads: number;
}


/**
 * Fetches and processes lead counts grouped by telecaller and status from Supabase.
 */
async function getTelecallerLeadSummary(): Promise<TelecallerSummary[]> {
  const supabase = await createClient();

  // 1. Fetch all users (telecallers) to get their full names
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, full_name");
  
  if (userError) {
    console.error("Error fetching users:", userError);
    return []; 
  }

  const userMap = new Map(users.map(u => [u.id, u.full_name]));

  // 2. Fetch the aggregate counts from 'leads' table in one go.
  const { data: leadCountsRaw, error: countError } = await supabase
    .from("leads")
    // Use PostgREST's aggregate feature: select the columns to group by + the count.
    .select("assigned_to, status, count") 
    .not("assigned_to", "is", null) // Only count leads that are actually assigned
    .returns<Array<{ assigned_to: string, status: string, count: number }>>()
    
  if (countError) {
    console.error("Error fetching lead counts:", countError);
    return [];
  }

  // 3. Process raw data into the final structured format for the UI
  const summaryMap = new Map<string, TelecallerSummary>();

  // Initialize the map with all users
  users.forEach(user => {
    summaryMap.set(user.id, {
      telecallerId: user.id,
      telecallerName: user.full_name,
      statusCounts: {},
      totalLeads: 0,
    });
  });

  // Populate counts from the query result
  leadCountsRaw.forEach(item => {
    const telecallerId = item.assigned_to;
    const count = item.count;
    const status = item.status || "Unknown Status"; // Handle potential null status leads

    if (telecallerId && userMap.has(telecallerId)) {
      const summary = summaryMap.get(telecallerId)!;
      // Add the count to the specific status
      summary.statusCounts[status] = (summary.statusCounts[status] || 0) + count;
      // Accumulate to the total leads
      summary.totalLeads += count;
    }
  });

  // Convert map to array, filter out users who have no leads, and sort by total leads (descending)
  const summaryArray = Array.from(summaryMap.values())
    .filter(tc => tc.totalLeads > 0)
    .sort((a, b) => b.totalLeads - a.totalLeads);

  return summaryArray;
}


// --- Next.js Page Component ---
export default async function TelecallerLeadSummaryPage() {
  const summaryData = await getTelecallerLeadSummary();
  const allStatuses = LEAD_STATUSES; 

  return (
    <div className="space-y-6 p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-primary" />
          Telecaller Lead Status Summary
        </h1>
      </div>

      <p className="text-gray-500">
        This view displays the **total available leads** for each telecaller, broken down by their current **status**.
      </p>
      
      {/* Summary Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lead Distribution by Telecaller
            <Badge variant="secondary" className="ml-2">
              Showing {summaryData.length} Active Telecallers
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50/90">
                  <TableHead className="w-[180px] font-semibold text-gray-700">Telecaller</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700 w-[100px] whitespace-nowrap">TOTAL LEADS</TableHead>
                  {/* Column for each defined lead status */}
                  {allStatuses.map((status) => (
                    <TableHead 
                      key={status} 
                      className="text-right font-semibold text-gray-700 whitespace-nowrap"
                    >
                      {status}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaryData.map((telecaller) => (
                  <TableRow key={telecaller.telecallerId}>
                    <TableCell className="font-medium text-gray-900">{telecaller.telecallerName}</TableCell>
                    {/* Total Leads Column - Highlighted */}
                    <TableCell className="text-right font-bold text-lg text-primary bg-primary/5">
                      {telecaller.totalLeads.toLocaleString()}
                    </TableCell>
                    {/* Status Count Columns (showing only numbers) */}
                    {allStatuses.map((status) => {
                      const count = telecaller.statusCounts[status] || 0;
                      return (
                        <TableCell 
                          key={status} 
                          className={`text-right ${count > 0 ? 'font-semibold text-gray-800' : 'text-gray-400'}`}
                        >
                          {count.toLocaleString()}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                
                {/* Empty State */}
                {summaryData.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={allStatuses.length + 2} className="h-24 text-center text-gray-500">
                            No assigned leads found for any telecaller.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
