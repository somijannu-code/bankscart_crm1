"use client";

import { useState } from "react";
import { useAttendance } from "@/hooks/use-attendance";
import { Button } from "@/components/ui/button"; // Remove the duplicate import on line 11
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, Coffee, LogIn, LogOut, CheckCircle, XCircle } from "lucide-react";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";

export function AttendanceWidget() {
  const {
    todayAttendance,
    loading,
    checkIn,
    checkOut,
    startLunchBreak,
    endLunchBreak,
    refresh
  } = useAttendance();

  const [notes, setNotes] = useState("");
  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [showBreakDialog, setShowBreakDialog] = useState(false);

  const handleCheckIn = async () => {
    try {
      await checkIn(notes);
      setNotes("");
      setShowCheckInDialog(false);
    } catch (error) {
      console.error("Check-in failed:", error);
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut(notes);
      setNotes("");
      setShowCheckOutDialog(false);
    } catch (error) {
      console.error("Check-out failed:", error);
    }
  };

  const handleStartLunchBreak = async () => {
    try {
      await startLunchBreak();
      setShowBreakDialog(false);
    } catch (error) {
      console.error("Lunch break start failed:", error);
    }
  };

  const handleEndLunchBreak = async () => {
    try {
      await endLunchBreak();
      setShowBreakDialog(false);
    } catch (error) {
      console.error("Lunch break end failed:", error);
    }
  };

  const getBreakDuration = () => {
    if (!todayAttendance?.lunch_start) return null;
    
    const startTime = new Date(todayAttendance.lunch_start);
    const endTime = todayAttendance.lunch_end ? new Date(todayAttendance.lunch_end) : new Date();
    
    return differenceInMinutes(endTime, startTime);
  };

  const getWorkingHours = () => {
    if (!todayAttendance?.check_in) return null;
    
    const checkInTime = new Date(todayAttendance.check_in);
    const checkOutTime = todayAttendance.check_out ? new Date(todayAttendance.check_out) : new Date();
    
    let totalMinutes = differenceInMinutes(checkOutTime, checkInTime);
    
    // Subtract break time
    if (todayAttendance.lunch_start) {
      const breakStart = new Date(todayAttendance.lunch_start);
      const breakEnd = todayAttendance.lunch_end ? new Date(todayAttendance.lunch_end) : new Date();
      totalMinutes -= differenceInMinutes(breakEnd, breakStart);
    }
    
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60
    };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">Loading attendance...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Today's Attendance
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
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <XCircle className="h-4 w-4" />
                  <span>Not checked in</span>
                </div>
              )}
            </div>

            {/* Lunch Break Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Lunch Break:</span>
              {todayAttendance?.lunch_start ? (
                <div className="flex items-center gap-2">
                  {todayAttendance.lunch_end ? (
                    <div className="text-green-600">
                      <span>
                        {format(new Date(todayAttendance.lunch_start), "hh:mm a")} -{" "}
                        {format(new Date(todayAttendance.lunch_end), "hh:mm a")}
                      </span>
                    </div>
                  ) : (
                    <div className="text-orange-600">
                      <span>Started at {format(new Date(todayAttendance.lunch_start), "hh:mm a")}</span>
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-gray-500">Not taken</span>
              )}
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
                  {getWorkingHours()?.hours}h {getWorkingHours()?.minutes}m
                </span>
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
                      {todayAttendance.lunch_start && !todayAttendance.lunch_end ? "End Break" : "Start Break"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {todayAttendance.lunch_start && !todayAttendance.lunch_end ? "End Lunch Break" : "Start Lunch Break"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p>
                        {todayAttendance.lunch_start && !todayAttendance.lunch_end
                          ? "Are you sure you want to end your lunch break?"
                          : "Are you sure you want to start your lunch break?"}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowBreakDialog(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={todayAttendance.lunch_start && !todayAttendance.lunch_end ? handleEndLunchBreak : handleStartLunchBreak}
                          className="flex-1"
                        >
                          Confirm
                        </Button>
                      </div>
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
  );
}
