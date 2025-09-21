"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Clock, 
  BarChart3, 
  MapPin, 
  Wifi, 
  Coffee, 
  LogIn, 
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pause,
  Play,
  Monitor
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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { AttendanceRecord, BreakRecord } from "@/lib/database-schema";
import { enhancedAttendanceService } from "@/lib/attendance-service-enhanced";

export default function EnhancedTelecallerAttendancePage() {
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [breakRecords, setBreakRecords] = useState<BreakRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [showBreakDialog, setShowBreakDialog] = useState(false);
  const [breakType, setBreakType] = useState("lunch");
  const [idleTime, setIdleTime] = useState(0);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const supabase = createClient();

  // Track user activity for idle time detection
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    let idleInterval: NodeJS.Timeout;
    
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      setLastActivity(new Date());
      
      // Set idle timeout to 5 minutes
      idleTimer = setTimeout(() => {
        // User is idle
        setIdleTime(prev => prev + 1);
      }, 5 * 60 * 1000); // 5 minutes
    };
    
    // Set up event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetIdleTimer, true);
    });
    
    // Initialize
    resetIdleTimer();
    
    // Set up interval to update idle time display
    idleInterval = setInterval(() => {
      if (lastActivity) {
        const minutesSinceLastActivity = Math.floor(
          (new Date().getTime() - lastActivity.getTime()) / (1000 * 60)
        );
        // Only show idle time if more than 5 minutes have passed
        if (minutesSinceLastActivity >= 5) {
          setIdleTime(minutesSinceLastActivity - 5);
        }
      }
    }, 60000); // Update every minute
    
    return () => {
      clearTimeout(idleTimer);
      clearInterval(idleInterval);
      events.forEach(event => {
        window.removeEventListener(event, resetIdleTimer, true);
      });
    };
  }, [lastActivity]);

  useEffect(() => {
    loadAttendanceData();
  }, [dateRange]);

  const loadAttendanceData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load today's attendance
      const todayRecord = await enhancedAttendanceService.getTodayAttendance(user.id);
      setTodayAttendance(todayRecord);

      // Load attendance history
      const history = await enhancedAttendanceService.getAttendanceHistory(
        user.id,
        format(dateRange.start, "yyyy-MM-dd"),
        format(dateRange.end, "yyyy-MM-dd")
      );
      setAttendanceHistory(history);

      // Load break records for today
      if (todayRecord) {
        const breaks = await enhancedAttendanceService.getBreakRecords(
          user.id,
          todayRecord.date
        );
        setBreakRecords(breaks);
      }
    } catch (error) {
      console.error("Error loading attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In a real implementation, we would get location and IP
      // For now, we'll pass null values
      const attendance = await enhancedAttendanceService.checkIn(
        user.id,
        undefined, // location
        undefined, // IP
        undefined, // device info
        notes
      );
      
      setTodayAttendance(attendance);
      setNotes("");
      setShowCheckInDialog(false);
    } catch (error) {
      console.error("Check-in failed:", error);
    }
  };

  const handleCheckOut = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const attendance = await enhancedAttendanceService.checkOut(
        user.id,
        undefined, // location
        undefined, // IP
        undefined, // device info
        notes
      );
      
      setTodayAttendance(attendance);
      setNotes("");
      setShowCheckOutDialog(false);
    } catch (error) {
      console.error("Check-out failed:", error);
    }
  };

  const handleStartBreak = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !todayAttendance) return;

      await enhancedAttendanceService.startBreak(
        user.id,
        breakType,
        notes
      );
      
      // Refresh break records
      const breaks = await enhancedAttendanceService.getBreakRecords(
        user.id,
        todayAttendance.date
      );
      setBreakRecords(breaks);
      
      setNotes("");
      setShowBreakDialog(false);
    } catch (error) {
      console.error("Start break failed:", error);
    }
  };

  const handleEndBreak = async (breakId: string) => {
    try {
      await enhancedAttendanceService.endBreak(breakId, notes);
      
      // Refresh break records
      if (todayAttendance) {
        const breaks = await enhancedAttendanceService.getBreakRecords(
          (await supabase.auth.getUser()).data.user!.id,
          todayAttendance.date
        );
        setBreakRecords(breaks);
      }
      
      setNotes("");
    } catch (error) {
      console.error("End break failed:", error);
    }
  };

  const getWorkingHours = (record: AttendanceRecord) => {
    if (!record.check_in) return null;
    
    const checkInTime = new Date(record.check_in);
    const checkOutTime = record.check_out ? new Date(record.check_out) : new Date();
    
    let totalMinutes = differenceInMinutes(checkOutTime, checkInTime);
    
    // Subtract break time
    const recordBreaks = breakRecords.filter(b => b.date === record.date);
    recordBreaks.forEach(breakRecord => {
      if (breakRecord.end_time) {
        totalMinutes -= differenceInMinutes(
          new Date(breakRecord.end_time),
          new Date(breakRecord.start_time)
        );
      }
    });
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present": return "bg-green-100 text-green-800";
      case "late": return "bg-yellow-100 text-yellow-800";
      case "absent": return "bg-red-100 text-red-800";
      case "half-day": return "bg-orange-100 text-orange-800";
      case "leave": return "bg-blue-100 text-blue-800";
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
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const calculateStats = () => {
    const presentDays = attendanceHistory.filter(a => a.status === 'present' || a.status === 'late').length;
    const absentDays = attendanceHistory.filter(a => a.status === 'absent').length;
    const lateDays = attendanceHistory.filter(a => a.status === 'late').length;
    const halfDays = attendanceHistory.filter(a => a.status === 'half-day').length;
    
    // Calculate total overtime hours
    let totalOvertime = 0;
    attendanceHistory.forEach(record => {
      if (record.overtime_hours) {
        const [hours, minutes] = record.overtime_hours.split(':').map(Number);
        totalOvertime += hours + (minutes / 60);
      }
    });
    
    return {
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      totalOvertime
    };
  };

  const stats = calculateStats();

  // Calculate total break time for today
  const getTotalBreakTime = () => {
    let totalMinutes = 0;
    breakRecords.forEach(breakRecord => {
      if (breakRecord.end_time) {
        totalMinutes += differenceInMinutes(
          new Date(breakRecord.end_time),
          new Date(breakRecord.start_time)
        );
      } else {
        // For ongoing breaks, calculate time so far
        totalMinutes += differenceInMinutes(
          new Date(),
          new Date(breakRecord.start_time)
        );
      }
    });
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  const breakTime = getTotalBreakTime();

  if (loading) {
    return <div className="p-6">Loading attendance data...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600 mt-1">Track your daily attendance and working hours</p>
        </div>
        <Button variant="outline">
          <Calendar className="h-4 w-4 mr-2" />
          {format(new Date(), "MMMM yyyy")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Present:</span>
                <span className="text-green-600 font-semibold">{stats.presentDays} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Late:</span>
                <span className="text-yellow-600 font-semibold">{stats.lateDays} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Absent:</span>
                <span className="text-red-600 font-semibold">{stats.absentDays} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Half Days:</span>
                <span className="text-orange-600 font-semibold">{stats.halfDays} days</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">Overtime:</span>
                <span className="font-semibold">{stats.totalOvertime.toFixed(1)} hours</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Attendance Widget */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Attendance - {format(new Date(), "EEEE, MMM dd")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Check-in Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Check-in:</span>
                  {todayAttendance?.check_in ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>{format(new Date(todayAttendance.check_in), "hh:mm a")}</span>
                      {todayAttendance.location_check_in && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-blue-500" />
                          <span className="text-xs">Office</span>
                        </div>
                      )}
                      {todayAttendance.ip_check_in && (
                        <div className="flex items-center gap-1">
                          <Wifi className="h-4 w-4 text-green-500" />
                          <span className="text-xs">
                            {todayAttendance.ip_check_in.substring(0, 7) + "..."}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <XCircle className="h-4 w-4" />
                      <span>Not checked in</span>
                    </div>
                  )}
                </div>

                {/* Break Status */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Breaks:</span>
                    <span className="text-sm text-gray-500">
                      {breakRecords.filter(b => b.end_time).length} taken
                    </span>
                  </div>
                  
                  {breakRecords.map(breakRecord => (
                    <div key={breakRecord.id} className="flex items-center justify-between text-sm pl-4">
                      <div>
                        <span className="capitalize">{breakRecord.break_type}</span>
                        <span className="text-gray-500 ml-2">
                          {format(new Date(breakRecord.start_time), "hh:mm a")}
                          {breakRecord.end_time && ` - ${format(new Date(breakRecord.end_time), "hh:mm a")}`}
                        </span>
                      </div>
                      {!breakRecord.end_time && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEndBreak(breakRecord.id)}
                        >
                          End
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Idle Time */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Idle Time:</span>
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {idleTime > 0 ? `${idleTime} min` : "Active"}
                    </span>
                    {idleTime > 0 && (
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Pause className="h-3 w-3" />
                        <span className="text-xs">Idle</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Check-out Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Check-out:</span>
                  {todayAttendance?.check_out ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>{format(new Date(todayAttendance.check_out), "hh:mm a")}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500">Not checked out</span>
                  )}
                </div>

                {/* Working Hours */}
                {todayAttendance?.check_in && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Working Hours:</span>
                    <span className="text-sm font-semibold">
                      {getWorkingHours(todayAttendance)?.hours}h {getWorkingHours(todayAttendance)?.minutes}m
                    </span>
                  </div>
                )}

                {/* Break Time */}
                {breakRecords.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Break Time:</span>
                    <span className="text-sm font-semibold">
                      {breakTime.hours}h {breakTime.minutes}m
                    </span>
                  </div>
                )}

                {/* Overtime */}
                {todayAttendance?.overtime_hours && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overtime:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-green-600">{todayAttendance.overtime_hours}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-6 flex-wrap">
                {!todayAttendance?.check_in ? (
                  <Dialog open={showCheckInDialog} onOpenChange={setShowCheckInDialog}>
                    <DialogTrigger asChild>
                      <Button className="flex-1">
                        <LogIn className="h-4 w-4 mr-2" />
                        Check In
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Check In</DialogTitle>
                        <DialogDescription>
                          Start your work day. You can add optional notes.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="checkin-notes">Notes (Optional)</Label>
                          <Textarea
                            id="checkin-notes"
                            placeholder="Any notes for today..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </div>
                        <Button onClick={handleCheckIn} className="w-full">
                          Confirm Check In
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : !todayAttendance.check_out && (
                  <>
                    <Dialog open={showBreakDialog} onOpenChange={setShowBreakDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="flex-1">
                          <Coffee className="h-4 w-4 mr-2" />
                          Start Break
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Start Break</DialogTitle>
                          <DialogDescription>
                            Take a break from work.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Break Type</Label>
                            <Select value={breakType} onValueChange={setBreakType}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="lunch">Lunch Break</SelectItem>
                                <SelectItem value="tea">Tea Break</SelectItem>
                                <SelectItem value="personal">Personal Break</SelectItem>
                                <SelectItem value="meeting">Meeting</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="break-notes">Notes (Optional)</Label>
                            <Textarea
                              id="break-notes"
                              placeholder="Any notes..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                          </div>
                          <Button onClick={handleStartBreak} className="w-full">
                            Start Break
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={showCheckOutDialog} onOpenChange={setShowCheckOutDialog}>
                      <DialogTrigger asChild>
                        <Button className="flex-1">
                          <LogOut className="h-4 w-4 mr-2" />
                          Check Out
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Check Out</DialogTitle>
                          <DialogDescription>
                            End your work day. You can add notes about your day.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="checkout-notes">Notes (Optional)</Label>
                            <Textarea
                              id="checkout-notes"
                              placeholder="How was your day?..."
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                            />
                          </div>
                          <Button onClick={handleCheckOut} className="w-full">
                            Confirm Check Out
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History - {format(new Date(), "MMMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Breaks</TableHead>
                <TableHead>Overtime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceHistory.map(record => {
                // Get break records for this date
                const dateBreaks = breakRecords.filter(b => b.date === record.date);
                const totalBreakMinutes = dateBreaks.reduce((total, breakRecord) => {
                  if (breakRecord.end_time) {
                    return total + differenceInMinutes(
                      new Date(breakRecord.end_time),
                      new Date(breakRecord.start_time)
                    );
                  }
                  return total;
                }, 0);
                
                const breakHours = Math.floor(totalBreakMinutes / 60);
                const breakMinutes = totalBreakMinutes % 60;
                
                return (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-medium">
                        {format(new Date(record.date), "EEE, MMM dd")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.replace('-', ' ')}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {record.check_in ? format(new Date(record.check_in), "hh:mm a") : '-'}
                    </TableCell>
                    <TableCell>
                      {record.check_out ? format(new Date(record.check_out), "hh:mm a") : '-'}
                    </TableCell>
                    <TableCell>
                      {record.total_hours || '-'}
                    </TableCell>
                    <TableCell>
                      {totalBreakMinutes > 0 ? `${breakHours}h ${breakMinutes}m` : '-'}
                    </TableCell>
                    <TableCell>
                      {record.overtime_hours ? (
                        <div className="flex items-center gap-1">
                          <span className="text-green-600">{record.overtime_hours}</span>
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