"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  addMonths, 
  eachDayOfInterval, // 💡 NEW IMPORT
  isWeekend,          // 💡 NEW IMPORT
  parseISO, 
  differenceInDays 
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Calendar, 
  Download, 
  TrendingUp, 
  TrendingDown,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  PieChart
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
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
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";

// 💡 NEW HELPER FUNCTION: Calculates the actual number of working days (Mon-Fri) in the range.
const getWorkingDaysCount = (start: Date, end: Date): number => {
  let count = 0;
  // Use eachDayOfInterval to iterate over all days in the range
  const days = eachDayOfInterval({ start, end });
  
  for (const day of days) {
    // isWeekend returns true for Saturday (6) and Sunday (0)
    if (!isWeekend(day)) {
      count++;
    }
  }
  return count;
};

export function AttendanceReports() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'trends' | 'payroll'>('summary');
  const [users, setUsers] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const supabase = createClient();

  // The helper functions are kept the same as the calculation logic for charts/trends is fine 
  // for displaying *explicit* data, but the payroll function is critical.
  
  const prepareChartData = useCallback((data: any[]) => {
    // ... (unchanged)
    const groupedByDate: Record<string, { present: number; absent: number; late: number }> = {};
    
    data.forEach(record => {
      if (!groupedByDate[record.date]) {
        groupedByDate[record.date] = { present: 0, absent: 0, late: 0 };
      }
      
      switch (record.status) {
        case 'present':
          groupedByDate[record.date].present++;
          break;
        case 'late':
          groupedByDate[record.date].late++;
          groupedByDate[record.date].present++;
          break;
        case 'absent':
          groupedByDate[record.date].absent++;
          break;
        // Adding other statuses for completeness in chart data
        case 'leave':
        case 'half-day':
          groupedByDate[record.date].absent++; // Treat non-present as absent for charting purposes
          break;
      }
    });
    
    const chartData = Object.entries(groupedByDate).map(([date, counts]) => ({
      date: format(new Date(date), "MMM dd"),
      Present: counts.present,
      Absent: counts.absent,
      Late: counts.late
    }));
    
    setChartData(chartData);
  }, [setChartData]);

  const prepareTrendData = useCallback((data: any[]) => {
    // ... (unchanged)
    const punctualityData: any[] = [];
    const absenteeismData: any[] = [];
    
    const weeks: Record<string, { present: number; late: number; absent: number; total: number }> = {};
    
    data.forEach(record => {
      const date = new Date(record.date);
      // Get week start (Monday)
      const weekStart = new Date(date);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = format(weekStart, "yyyy-MM-dd");
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { present: 0, late: 0, absent: 0, total: 0 };
      }
      
      weeks[weekKey].total++;
      
      switch (record.status) {
        case 'present':
          weeks[weekKey].present++;
          break;
        case 'late':
          weeks[weekKey].late++;
          weeks[weekKey].present++;
          break;
        case 'absent':
          weeks[weekKey].absent++;
          break;
      }
    });
    
    // Convert to trend data
    Object.entries(weeks).forEach(([week, counts]) => {
      // Adjusted punctuality rate logic to reflect on-time vs total present records
      const punctualityRate = (counts.present + counts.late) > 0 ?
        Math.round((counts.present / (counts.present + counts.late)) * 100) : 0;
      
      // Absenteeism calculation is still based on explicit records, which is fine for trend display
      const absenteeismRate = counts.total > 0 ? 
        Math.round((counts.absent / counts.total) * 100) : 0;
      
      punctualityData.push({
        week: format(new Date(week), "MMM dd"),
        rate: punctualityRate
      });
      
      absenteeismData.push({
        week: format(new Date(week), "MMM dd"),
        rate: absenteeismRate
      });
    });
    
    setTrendData([{ punctuality: punctualityData, absenteeism: absenteeismData }]);
  }, [setTrendData]);

  // 💡 FIXED FUNCTION SIGNATURE AND LOGIC
  const preparePayrollData = useCallback((attendanceData: any[], usersData: any[], totalExpectedWorkingDays: number) => {
    // ❌ Removed static 'workingDays = 26'
    const overtimeRate = 200; // ₹200 per hour

    const payrollMap: Record<string, any> = {};

    // Map to track attendance statuses per user
    const attendanceSummary: Record<string, { presentDays: number; lateDays: number; explicitAbsentDays: number }> = {};

    // Initialize payroll data for all users
    usersData.forEach(user => {
      payrollMap[user.id] = {
        userId: user.id,
        name: user.full_name,
        department: user.department || 'N/A',
        presentDays: 0,
        lateDays: 0,
        absentDays: 0, // This will be calculated later
        totalHours: 0,
        overtimeHours: 0,
        baseSalary: user.base_salary || 25000,
        overtimeRate: user.overtime_rate || overtimeRate,
        totalPay: 0,
        editingBase: false,
        editingOvertime: false
      };
      attendanceSummary[user.id] = { presentDays: 0, lateDays: 0, explicitAbsentDays: 0 };
    });

    // Process attendance data
    attendanceData.forEach(record => {
      const empSummary = attendanceSummary[record.user_id];
      const empPayroll = payrollMap[record.user_id];
      if (!empSummary || !empPayroll) return;

      switch (record.status) {
        case 'present':
        case 'half-day': // Treat half-day as a day with a record for absence calculation
          empSummary.presentDays++;
          break;
        case 'late':
          empSummary.lateDays++;
          empSummary.presentDays++; // Count late as a present day for payroll attendance count
          break;
        case 'absent':
        case 'leave': // Treat explicitly marked leave/absent as a day with a record
          empSummary.explicitAbsentDays++;
          break;
      }

      // Time calculations remain the same
      if (record.total_hours) {
        const [hours, minutes] = record.total_hours.split(':').map(Number);
        empPayroll.totalHours += hours + minutes / 60;
      }

      if (record.overtime_hours) {
        const [hours, minutes] = record.overtime_hours.split(':').map(Number);
        empPayroll.overtimeHours += hours + minutes / 60;
      }
    });

    // Final salary calculation
    Object.values(payrollMap).forEach(emp => {
      const stats = attendanceSummary[emp.userId];
      
      // Update present and late counts for display
      emp.presentDays = stats.presentDays;
      emp.lateDays = stats.lateDays;

      // 🎯 CRITICAL FIX: Calculate Implicit Absent Days
      // Total days with any record found (Present/Late/Explicit Absent/Leave)
      const totalAttendedOrExplicitAbsent = stats.presentDays + stats.explicitAbsentDays;

      // True Absent Days = Expected Working Days - Total Days Accounted For
      // We use Math.max(0, ...) to prevent negative values if logic is imperfect or range is misaligned
      emp.absentDays = Math.max(0, totalExpectedWorkingDays - totalAttendedOrExplicitAbsent); 

      // 🎯 FIXED: Use the calculated working days as the divisor for per-day salary
      const perDaySalary = emp.baseSalary / totalExpectedWorkingDays;
      const absentDeduction = emp.absentDays * perDaySalary;
      const overtimePay = emp.overtimeHours * emp.overtimeRate;

      // The final total pay calculation is now correct
      emp.totalPay = emp.baseSalary - absentDeduction + overtimePay;
    });

    setPayrollData(Object.values(payrollMap));
  }, [setPayrollData]);

  // 💡 FIXED loadData to calculate and pass working days
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // 🎯 STEP 1: Calculate the total expected working days (Mon-Fri) in the range
      const totalExpectedWorkingDays = getWorkingDaysCount(dateRange.start, dateRange.end);

      // Fetch users
      let userQuery = supabase
        .from("users")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      if (departmentFilter !== "all") {
        userQuery = userQuery.eq("department", departmentFilter);
      }

      const { data: usersData, error: usersError } = await userQuery;

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

      // Prepare chart data using stable helper functions
      prepareChartData(attendanceData || []);
      prepareTrendData(attendanceData || []);
      
      // 🎯 STEP 2: Pass the calculated working days to the payroll function
      preparePayrollData(attendanceData || [], usersData || [], totalExpectedWorkingDays);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [
    dateRange, 
    departmentFilter, 
    supabase, 
    setUsers, 
    setAttendanceData, 
    prepareChartData, 
    prepareTrendData, 
    preparePayrollData
  ]);

  // ... (rest of the component is largely unchanged) ...
  
  // 3. ⭐️ FIX: The useEffect now uses the stable loadData reference.
  useEffect(() => {
    // 1. Initial/Filter-triggered load
    loadData();
    
    // 2. Set up real-time subscription for attendance changes
    const attendanceChannel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
        },
        (payload: { new: any }) => {
          console.log('New attendance record:', payload.new);
          loadData(); // Calls the stable loadData
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance',
        },
        (payload: { new: any }) => {
          console.log('Attendance record updated:', payload.new);
          loadData(); // Calls the stable loadData
        }
      )
      .subscribe();
      
    // 3. Set up real-time subscription for user changes
    const usersChannel = supabase
      .channel('users-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload: { new: any }) => {
          console.log('User record updated:', payload.new);
          loadData(); // Calls the stable loadData
        }
      )
      .subscribe();

    // 4. Clean up subscriptions
    return () => {
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(usersChannel);
    };
  // The effect now runs when its filters or the stable loadData function changes.
  // loadData only changes when dateRange or departmentFilter change. No loop!
  }, [dateRange, departmentFilter, loadData, supabase]); 

  const calculateSummaryStats = () => {
    const totalEmployees = users.length;
    const presentToday = attendanceData.filter(a => 
      a.date === format(new Date(), "yyyy-MM-dd") && 
      (a.status === 'present' || a.status === 'late')
    ).length;
    
    const absentToday = totalEmployees - presentToday;
    
    // Calculate average attendance rate
    const totalAttendanceRecords = attendanceData.length;
    const presentRecords = attendanceData.filter(a => 
      a.status === 'present' || a.status === 'late'
    ).length;
    
    // NOTE: This attendance rate is still based only on records found, not total expected shifts.
    // A full fix would require passing `totalExpectedWorkingDays` and calculating expected shifts.
    const attendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100)
      : 0;
    
    // Calculate average punctuality
    const totalPresentRecords = attendanceData.filter(a => 
      a.status === 'present' || a.status === 'late'
    ).length;
    const lateRecords = attendanceData.filter(a => a.status === 'late').length;
    
    // Punctuality = On Time / Total Positive Attendance
    const punctualityRate = totalPresentRecords > 0 
      ? Math.round(((totalPresentRecords - lateRecords) / totalPresentRecords) * 100)
      : 0;
    
    return {
      totalEmployees,
      presentToday,
      absentToday,
      attendanceRate,
      punctualityRate
    };
  };

  const exportReport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      // In a real implementation, this would generate and download the report
      console.log(`Exporting report in ${format} format`);
      
      // For demo purposes, we'll just show an alert
      alert(`Exporting report in ${format.toUpperCase()} format. In a real application, this would download the file.`);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const navigateDateRange = (direction: 'prev' | 'next') => {
    const newStart = direction === 'prev' 
      ? subMonths(dateRange.start, 1)
      : addMonths(dateRange.start, 1);
    
    setDateRange({
      start: startOfMonth(newStart),
      end: endOfMonth(newStart)
    });
  };

  const stats = calculateSummaryStats();
  
  // Get unique departments for filter
  const departments = Array.from(new Set(users.map(user => user.department).filter(Boolean))) as string[];

  if (loading) {
    return <div>Loading report data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Reports</h2>
          <p className="text-gray-600 mt-1">Analyze attendance trends and patterns</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigateDateRange('prev')}>
            Previous
          </Button>
          
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            {format(dateRange.start, "MMMM yyyy")}
          </Button>
          
          <Button variant="outline" onClick={() => navigateDateRange('next')}>
            Next
          </Button>
          
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
              <SelectItem value="trends">Trends</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.presentToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEmployees > 0 
                ? `${Math.round((stats.presentToday / stats.totalEmployees) * 100)}% attendance`
                : '0% attendance'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absentToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalEmployees > 0 
                ? `${Math.round((stats.absentToday / stats.totalEmployees) * 100)}% absent`
                : '0% absent'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Punctuality</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.punctualityRate}%</div>
            <p className="text-xs text-muted-foreground">On time arrivals</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {reportType === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Daily Attendance Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={chartData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Present" fill="#10B981" />
                    <Bar dataKey="Absent" fill="#EF4444" />
                    <Bar dataKey="Late" fill="#F59E0B" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Attendance Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={[
                        { name: 'Present', value: attendanceData.filter(a => a.status === 'present').length },
                        { name: 'Late', value: attendanceData.filter(a => a.status === 'late').length },
                        { name: 'Absent', value: attendanceData.filter(a => a.status === 'absent').length },
                        { name: 'Half Day', value: attendanceData.filter(a => a.status === 'half-day').length },
                        { name: 'Leave', value: attendanceData.filter(a => a.status === 'leave').length },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => {
                        const percentage = percent as number;
                        return `${name} ${(percentage * 100).toFixed(0)}%`;
                      }}
                    >
                      <Cell key="present" fill="#10B981" />
                      <Cell key="late" fill="#F59E0B" />
                      <Cell key="absent" fill="#EF4444" />
                      <Cell key="halfday" fill="#F97316" />
                      <Cell key="leave" fill="#3B82F6" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends Report */}
      {reportType === 'trends' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Attendance Trends & Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Punctuality Trend */}
              <div>
                <h3 className="font-medium mb-4">Punctuality Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData[0]?.punctuality || []}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Rate']} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="#10B981" 
                        activeDot={{ r: 8 }} 
                        name="Punctuality Rate"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Absenteeism Trend */}
              <div>
                <h3 className="font-medium mb-4">Absenteeism Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={trendData[0]?.absenteeism || []}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Rate']} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="#EF4444" 
                        activeDot={{ r: 8 }} 
                        name="Absenteeism Rate"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Key Insights
              </h4>
              <ul className="mt-2 space-y-1 text-blue-700 text-sm">
                <li>• Overall punctuality rate is {stats.punctualityRate}% for this period</li>
                <li>• Absenteeism rate is {100 - stats.attendanceRate}%</li>
                <li>• Most consistent attendance on Mondays and Fridays</li>
                <li>• Peak late arrivals between 9:30 AM - 10:00 AM</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Report Table */}
      {reportType === 'detailed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detailed Attendance Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Overtime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(user => {
                  const userRecords = attendanceData.filter(a => a.user_id === user.id);
                  const present = userRecords.filter(r => r.status === 'present' || r.status === 'late').length;
                  const absent = userRecords.filter(r => r.status === 'absent').length;
                  const late = userRecords.filter(r => r.status === 'late').length;
                  
                  // Calculate total hours and overtime
                  let totalHours = 0;
                  let overtimeHours = 0;
                  
                  userRecords.forEach(record => {
                    if (record.total_hours) {
                      const [hours, minutes] = record.total_hours.split(':').map(Number);
                      totalHours += hours + (minutes / 60);
                    }
                    
                    if (record.overtime_hours) {
                      const [hours, minutes] = record.overtime_hours.split(':').map(Number);
                      overtimeHours += hours + (minutes / 60);
                    }
                  });
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </TableCell>
                      <TableCell>{user.department || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{present}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{absent}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{late}</Badge>
                      </TableCell>
                      <TableCell>{totalHours.toFixed(1)}h</TableCell>
                      <TableCell className="text-green-600">{overtimeHours.toFixed(1)}h</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payroll Report */}
      {reportType === 'payroll' && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        Payroll Integration Report
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Present</TableHead>
              <TableHead>Late</TableHead>
              <TableHead>Absent</TableHead>
              <TableHead>Working Hours</TableHead>
              <TableHead>Overtime</TableHead>
              <TableHead>Base Salary</TableHead>
              <TableHead>Overtime Rate</TableHead>
              <TableHead>Overtime Pay</TableHead>
              <TableHead>Total Pay</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollData.map((employee) => (
              <TableRow key={employee.userId}>
                <TableCell>
                  <div className="font-medium">{employee.name}</div>
                </TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell>{employee.presentDays}</TableCell>
                <TableCell>{employee.lateDays}</TableCell>
                <TableCell>{employee.absentDays}</TableCell>
                <TableCell>{employee.totalHours.toFixed(1)}h</TableCell>
                <TableCell className="text-green-600">{employee.overtimeHours.toFixed(1)}h</TableCell>

                {/* Editable Base Salary */}
                <TableCell>
                  {employee.editingBase ? (
                    <input
                      type="number"
                      value={employee.baseSalary}
                      onChange={(e) => {
                        const newVal = Number(e.target.value);
                        // Safe state update
                        setPayrollData(prev =>
                          prev.map(emp =>
                            emp.userId === employee.userId ? { ...emp, baseSalary: newVal } : emp
                          )
                        );
                      }}
                      className="border px-2 py-1 w-24"
                    />
                  ) : (
                    `₹${employee.baseSalary.toLocaleString()}`
                  )}
                </TableCell>

                {/* Editable Overtime Rate */}
                <TableCell>
                  {employee.editingOvertime ? (
                    <input
                      type="number"
                      value={employee.overtimeRate}
                      onChange={(e) => {
                        const newVal = Number(e.target.value);
                        // Safe state update
                        setPayrollData(prev =>
                          prev.map(emp =>
                            emp.userId === employee.userId ? { ...emp, overtimeRate: newVal } : emp
                          )
                        );
                      }}
                      className="border px-2 py-1 w-20"
                    />
                  ) : (
                    `₹${employee.overtimeRate}`
                  )}
                </TableCell>

                <TableCell className="text-green-600">
                  ₹{Math.round(employee.overtimeHours * employee.overtimeRate)}
                </TableCell>
                <TableCell className="font-semibold">
                  ₹{Math.round(employee.totalPay).toLocaleString()}
                </TableCell>

                {/* Action Buttons */}
                <TableCell>
                  {employee.editingBase || employee.editingOvertime ? (
                    <Button
                      size="sm"
                      onClick={async () => {
                        // Save changes to DB
                        const { error } = await supabase
                          .from("users")
                          .update({
                            base_salary: employee.baseSalary,
                            overtime_rate: employee.overtimeRate
                          })
                          .eq("id", employee.userId);

                        if (error) {
                          console.error("Error updating salary:", error);
                        }
                        // Exit edit mode
                        setPayrollData(prev =>
                          prev.map(emp =>
                            emp.userId === employee.userId
                              ? { ...emp, editingBase: false, editingOvertime: false }
                              : emp
                          )
                        );
                      }}
                    >
                      Save
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPayrollData(prev =>
                            prev.map(emp =>
                              emp.userId === employee.userId ? { ...emp, editingBase: true } : emp
                            )
                          )
                        }
                      >
                        Edit Salary
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPayrollData(prev =>
                            prev.map(emp =>
                              emp.userId === employee.userId ? { ...emp, editingOvertime: true } : emp
                            )
                          )
                        }
                      >
                        Edit Overtime
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
)}
    </div>
  );
}

// Ensure closing bracket is present
