"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Plus, 
  CheckCircle, 
  Clock, 
  XCircle 
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { LeaveRecord } from "@/lib/database-schema";
import { enhancedAttendanceService } from "@/lib/attendance-service-enhanced";

export function LeaveManagement() {
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveRecord['leave_type']>('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadLeaveData();
  }, []);

  const loadLeaveData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const leaveRecords = await enhancedAttendanceService.getLeaveRecords(user.id);
      setLeaves(leaveRecords);
    } catch (error) {
      console.error("Error loading leave data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await enhancedAttendanceService.applyForLeave(
        user.id,
        leaveType,
        startDate,
        endDate,
        reason
      );

      // Refresh leave data
      await loadLeaveData();
      
      // Reset form
      setLeaveType('casual');
      setStartDate('');
      setEndDate('');
      setReason('');
      setShowApplyDialog(false);
    } catch (error) {
      console.error("Error applying for leave:", error);
    }
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

  if (loading) {
    return <div>Loading leave data...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Management
            </CardTitle>
            <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Apply for Leave
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Apply for Leave</DialogTitle>
                  <DialogDescription>
                    Submit a leave application for approval.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Leave Type</Label>
                    <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveRecord['leave_type'])}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">Casual Leave</SelectItem>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="paid">Paid Leave</SelectItem>
                        <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                        <SelectItem value="maternity">Maternity Leave</SelectItem>
                        <SelectItem value="paternity">Paternity Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Textarea
                      placeholder="Reason for leave..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                  
                  <Button onClick={handleApplyLeave} className="w-full">
                    Submit Application
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {leaves.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map(leave => {
                  const start = new Date(leave.start_date);
                  const end = new Date(leave.end_date);
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  
                  return (
                    <TableRow key={leave.id}>
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
                        <div className="flex items-center gap-2">
                          {getStatusIcon(leave.status)}
                          <Badge className={getStatusColor(leave.status)}>
                            {leave.status}
                          </Badge>
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
              <p>No leave applications found</p>
              <p className="text-sm mt-2">Apply for leave using the button above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}