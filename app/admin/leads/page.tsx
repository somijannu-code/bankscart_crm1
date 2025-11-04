import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // Assuming Badge is available from the reference files

// Define a common set of lead statuses to ensure a consistent table structure.
// In a real application, you might fetch the unique list of statuses from a config table.
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
 * Fetches and processes lead counts grouped by telecaller and status.
 * This function runs server-side on the Next.js page.
 */
async function getTelecallerLeadSummary(): Promise<TelecallerSummary[]> {
  const supabase = await createClient();

  // 1. Fetch all users (potential telecallers)
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id, full_name");
  
  if (userError) {
    console.error("Error fetching users:", userError);
    return []; 
  }

  const userMap = new Map(users.map(u => [u.id, u.full_name]));

  // 2. Fetch the aggregate counts from 'leads' table.
  // This uses the PostgREST feature to perform a COUNT grouped by 'assigned_to' and 'status'.
  // NOTE: This relies on RLS (Row Level Security) being configured for the 'admin' user 
  // to allow this aggregate query on the 'leads' table.
  const { data: leadCountsRaw, error: countError } = await supabase
    .from("leads")
    // Select the columns to group by + the count aggregate.
    .select("assigned_to, status, count") 
    .not("assigned_to", "is", null) // Exclude leads not assigned to anyone
    .returns<Array<{ assigned_to: string, status: string, count: number }>>()
    
  if (countError) {
    console.error("Error fetching lead counts:", countError);
    // If this fails, consider creating a Supabase Stored Procedure (RPC) for aggregation.
    return [];
  }

  // 3. Process the raw data into the final structured format
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
    const status = item.status;
    const count = item.count;

    if (telecallerId && userMap.has(telecallerId) && status) {
      const summary = summaryMap.get(telecallerId)!;
      summary.statusCounts[status] = count;
      summary.totalLeads += count;
    }
  });

  // Convert map to array, filter out users who have no leads, and sort by total leads
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
        Overview of total leads assigned to each telecaller, broken down by lead status.
      </p>
      
      {/* Summary Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lead Distribution by Telecaller
            <Badge variant="secondary" className="ml-2">
              Total Telecallers: {summaryData.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 hover:bg-gray-50/90">
                  <TableHead className="w-[200px] font-semibold text-gray-700">Telecaller</TableHead>
                  <TableHead className="text-right font-semibold text-gray-700">Total Leads</TableHead>
                  {/* Create a column for each defined lead status */}
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
                    <TableCell className="text-right font-bold text-lg text-primary">
                      {telecaller.totalLeads.toLocaleString()}
                    </TableCell>
                    {/* Status Count Columns */}
                    {allStatuses.map((status) => {
                      const count = telecaller.statusCounts[status] || 0;
                      return (
                        <TableCell 
                          key={status} 
                          className={`text-right ${count > 0 ? 'font-medium' : 'text-gray-400'}`}
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
