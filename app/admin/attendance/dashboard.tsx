"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isToday, isYesterday, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Users, 
  Clock, 
  Download, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  Wifi, 
  Coffee,
  TrendingUp,
  TrendingDown,
  Activity,
  UserCheck,
  UserX,
  Pause,
  Monitor
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { User, AttendanceRecord } from "@/lib/database-schema";

export function AdminAttendanceDashboard() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [view, setView] = useState<'daily' | 'monthly'>('daily');
  const [users, setUsers] = useState<User[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [realTimeData, setRealTimeData] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    loadData();
    // Set up real-time subscription
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
        },
        (payload) => {
          // Refresh data when new attendance records are inserted
          loadData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance',
        },
        (payload) => {
          // Refresh data when attendance records are updated
          loadData();
        }
      )
      .subscribe();

    // Clean up subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange, view]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Fetch attendance data
      const { data: attendanceData, error: attendanceError } = await supabase
        .from("attendance")
        .select(`
          *,
          user:users!attendance_user_id_fkey(full_name, email, role, department)
        `)
        .gte("date", format(dateRange.start, "yyyy-MM-dd"))
        .lte("date", format(dateRange.end, "yyyy-MM-dd"))
        .order("date", { ascending: false });

      if (attendanceError) throw attendanceError;
      setAttendanceData(attendanceData || []);

      // Fetch real-time data for currently clocked-in users
      const { data: realTimeData, error: realTimeError } = await supabase
        .from("attendance")
        .select(`
          *,
          user:users!attendance_user_id_fkey(full_name, email, role, department)
        `)
        .not("check_in", "is", null)
        .is("check_out", null)
        .order("check_in", { ascending: false });

      if (!realTimeError) {
        setRealTimeData(realTimeData || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-green-100 text-green-800";
      case "late": return "bg-yellow-100 text-yellow-800";
      case "absent": return "bg-red-100 text-red-800";
      case "half-day": return "bg-orange-100 text-orange-800";
      case "leave": return "bg-blue-100 text-blue-800";
      case "holiday": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "late": return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "absent": return <XCircle className="h-4 w-4 text-red-500" />;
      case "half-day": return <Clock className="h-4 w-4 text-orange-500" />;
      case "leave": return <Coffee className="h-4 w-4 text-blue-500" />;
      case "holiday": return <Calendar className="h-4 w-4 text-purple-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || user.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  const departments = Array.from(new Set(users.map(user => user.department).filter(Boolean))) as string[];

  const getStats = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todayRecords = attendanceData.filter(record => record.date === today);
    
    const present = todayRecords.filter(r => r.status === "present" || r.status === "late").length;
    const absent = todayRecords.filter(r => r.status === "absent").length;
    const late = todayRecords.filter(r => r.status === "late").length;
    
    return { present, absent, late };
  };

  const stats = getStats();

  const exportData = (format: 'csv' | 'excel' | 'pdf') => {
    // Implementation for exporting data
    console.log(`Exporting data in ${format} format`);
  };

  const navigateDateRange = (direction: 'prev' | 'next') => {
    if (view === 'daily') {
      const newDate = direction === 'prev' 
        ? new Date(dateRange.start.setDate(dateRange.start.getDate() - 1))
        : new Date(dateRange.start.setDate(dateRange.start.getDate() + 1));
      
      setDateRange({
        start: newDate,
        end: newDate
      });
    } else {
      const newStart = direction === 'prev' 
        ? subMonths(dateRange.start, 1)
        : addMonths(dateRange.start, 1);
      
      setDateRange({
        start: startOfMonth(newStart),
        end: endOfMonth(newStart)
      });
    }
  };

  // Function to get time ago string
  const getTimeAgo = (dateString: string) => {
    const date = parseISO(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    return `${Math.floor(diffInHours / 24)} days ago`;
  };

  if (loading) {
    return <div className="p-6">Loading attendance data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Attendance Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage team attendance</p>
        </div>
        <div className="flex gap-2">
          <Select value={view} onValueChange={(v) => setView(v as 'daily' | 'monthly')}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily View</SelectItem>
              <SelectItem value="monthly">Monthly View</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => navigateDateRange('prev')}>
            Previous
          </Button>
          
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            {view === 'daily' 
              ? format(dateRange.start, "EEE, MMM dd, yyyy")
              : format(dateRange.start, "MMMM yyyy")}
          </Button>
          
          <Button variant="outline" onClick={() => navigateDateRange('next')}>
            Next
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportData('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('excel')}>
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData('pdf')}>
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Real-Time Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Team</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
              <p className="text-xs text-muted-foreground">Active team members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.present}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +2 from yesterday
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late Today</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                -1 from yesterday
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-red-500" />
                +1 from yesterday
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-Time Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            {realTimeData.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {realTimeData.map((record) => (
                  <div key={record.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                    <div className="flex-shrink-0">
                      <UserCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{record.user?.full_name}</p>
                      <p className="text-xs text-gray-500">
                        Checked in {getTimeAgo(record.check_in)}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(parseISO(record.check_in), "hh:mm a")}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active check-ins</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Real-Time Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Clocked In</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{realTimeData.length}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Break</CardTitle>
            <Coffee className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {realTimeData.filter(r => r.on_break).length}
            </div>
            <p className="text-xs text-muted-foreground">Employees on break</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Idle Time</CardTitle>
            <Pause className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">0</div>
            <p className="text-xs text-muted-foreground">Minutes detected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {view === 'daily' 
              ? `Attendance for ${format(dateRange.start, "EEEE, MMMM dd, yyyy")}`
              : `Attendance for ${format(dateRange.start, "MMMM yyyy")}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Overtime</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => {
                const userRecords = attendanceData.filter(a => a.user_id === user.id);
                const record = view === 'daily' 
                  ? userRecords.find(r => r.date === format(dateRange.start, "yyyy-MM-dd"))
                  : null; // For monthly view, we would aggregate data
                
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.full_name}</div>
                      <div className="text-sm text-gray-500">{user.department || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record?.status || 'absent')}
                        <Badge className={getStatusColor(record?.status || 'absent')}>
                          {record?.status ? record.status.replace('-', ' ') : 'Absent'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {record?.check_in ? format(new Date(record.check_in), "hh:mm a") : '-'}
                    </TableCell>
                    <TableCell>
                      {record?.check_out ? format(new Date(record.check_out), "hh:mm a") : '-'}
                    </TableCell>
                    <TableCell>
                      {record?.total_hours || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {record?.overtime_hours ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            {record.overtime_hours}
                          </>
                        ) : '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {record?.location_check_in ? (
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3 w-3 text-blue-500" />
                          Office
                        </div>
                      ) : record?.location_check_in === null ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Monitor className="h-3 w-3 text-gray-500" />
                          Remote
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {record?.ip_check_in ? (
                        <div className="flex items-center gap-1 text-xs">
                          <Wifi className="h-3 w-3 text-green-500" />
                          {record.ip_check_in.substring(0, 7) + "..."}
                        </div>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}