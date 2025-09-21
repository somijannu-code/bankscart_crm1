import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle,
  User
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";
import { format } from "date-fns";

// Define types
interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface LeaveRecord {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  user?: User;
  approver?: User;
}

export default async function AdminLeaveManagementPage() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch all pending leave applications
  const { data: leaveData, error } = await supabase
    .from("leaves")
    .select(`
      *,
      user:users!leaves_user_id_fkey(full_name, email, role),
      approver:users!leaves_approved_by_fkey(full_name, email, role)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching leave data:", error);
  }

  const pendingLeaves = leaveData as LeaveRecord[] || [];

  const handleApproveLeave = async (formData: FormData) => {
    "use server";
    const supabase = await createClient();
    const leaveId = formData.get("leaveId") as string;
    
    const { error } = await supabase
      .from("leaves")
      .update({
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString()
      })
      .eq("id", leaveId);
    
    if (error) {
      console.error("Error approving leave:", error);
    }
    
    // Redirect to refresh the page
    redirect("/admin/leave-management");
  };

  const handleRejectLeave = async (formData: FormData) => {
    "use server";
    const supabase = await createClient();
    const leaveId = formData.get("leaveId") as string;
    const rejectionReason = formData.get("rejectionReason") as string;
    
    const { error } = await supabase
      .from("leaves")
      .update({
        status: "rejected",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
        rejection_reason: rejectionReason
      })
      .eq("id", leaveId);
    
    if (error) {
      console.error("Error rejecting leave:", error);
    }
    
    // Redirect to refresh the page
    redirect("/admin/leave-management");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "rejected": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "paid": return "Paid Leave";
      case "unpaid": return "Unpaid Leave";
      case "sick": return "Sick Leave";
      case "casual": return "Casual Leave";
      case "maternity": return "Maternity Leave";
      case "paternity": return "Paternity Leave";
      default: return type;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">Manage employee leave applications</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Leave Applications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingLeaves.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingLeaves.map(leave => {
                  const start = new Date(leave.start_date);
                  const end = new Date(leave.end_date);
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  
                  return (
                    <TableRow key={leave.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10" />
                          <div>
                            <div className="font-medium">{leave.user?.full_name}</div>
                            <div className="text-sm text-gray-500">{leave.user?.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{getLeaveTypeLabel(leave.leave_type)}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {format(start, "MMM dd, yyyy")} - {format(end, "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {days} day{days !== 1 ? 's' : ''}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={leave.reason}>
                          {leave.reason}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <form action={handleApproveLeave}>
                            <input type="hidden" name="leaveId" value={leave.id} />
                            <Button size="sm" type="submit">
                              Approve
                            </Button>
                          </form>
                          
                          <form action={handleRejectLeave}>
                            <input type="hidden" name="leaveId" value={leave.id} />
                            <input 
                              type="text" 
                              name="rejectionReason" 
                              placeholder="Rejection reason" 
                              className="border rounded px-2 py-1 text-sm"
                              required
                            />
                            <Button size="sm" variant="destructive" type="submit">
                              Reject
                            </Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending leave applications</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}