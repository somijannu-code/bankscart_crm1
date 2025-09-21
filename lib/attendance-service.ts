import { createClient } from "./supabase/client" // Changed from server to client
import { differenceInMinutes } from "date-fns" // Add missing import

export interface AttendanceRecord {
  id: string
  user_id: string
  date: string
  check_in: string | null
  check_out: string | null
  lunch_start: string | null
  lunch_end: string | null
  total_hours: string | null
  break_hours: string | null
  status: string
  notes: string | null
}

export interface BreakRecord {
  id: string
  user_id: string
  date: string
  break_type: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export class AttendanceService {
  private static instance: AttendanceService

  private constructor() {}

  static getInstance(): AttendanceService {
    if (!AttendanceService.instance) {
      AttendanceService.instance = new AttendanceService()
    }
    return AttendanceService.instance
  }

  async checkIn(userId: string, notes?: string): Promise<AttendanceRecord> {
    const supabase = createClient() // Client-side instance
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from("attendance")
      .upsert(
        {
          user_id: userId,
          date: new Date().toISOString().split("T")[0],
          check_in: now,
          status: "present",
          notes: notes || null,
          updated_at: now,
        },
        {
          onConflict: "user_id, date",
        },
      )
      .select()
      .single()

    if (error) throw error
    return data
  }

  async checkOut(userId: string, notes?: string): Promise<AttendanceRecord> {
    const supabase = await createClient()
    const now = new Date().toISOString()

    // Get today's attendance record
    const { data: attendance } = await supabase
      .from("attendance")
      .select()
      .eq("user_id", userId)
      .eq("date", new Date().toISOString().split("T")[0])
      .single()

    if (!attendance) {
      throw new Error("No check-in record found for today")
    }

    // Calculate total hours
    const checkInTime = new Date(attendance.check_in!)
    const checkOutTime = new Date(now)
    const totalMinutes = differenceInMinutes(checkOutTime, checkInTime)

    // Subtract break time if any
    let breakMinutes = 0
    if (attendance.lunch_start && attendance.lunch_end) {
      breakMinutes = differenceInMinutes(new Date(attendance.lunch_end), new Date(attendance.lunch_start))
    }

    const workingMinutes = totalMinutes - breakMinutes
    const totalHours = `${Math.floor(workingMinutes / 60)}:${(workingMinutes % 60).toString().padStart(2, "0")}`

    const { data, error } = await supabase
      .from("attendance")
      .update({
        check_out: now,
        total_hours: totalHours,
        break_hours:
          breakMinutes > 0
            ? `${Math.floor(breakMinutes / 60)}:${(breakMinutes % 60).toString().padStart(2, "0")}`
            : null,
        notes: notes || attendance.notes,
        updated_at: now,
      })
      .eq("id", attendance.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async startLunchBreak(userId: string): Promise<AttendanceRecord> {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data: attendance } = await supabase
      .from("attendance")
      .select()
      .eq("user_id", userId)
      .eq("date", new Date().toISOString().split("T")[0])
      .single()

    if (!attendance) {
      throw new Error("Please check in first")
    }

    if (attendance.lunch_start) {
      throw new Error("Lunch break already started")
    }

    const { data, error } = await supabase
      .from("attendance")
      .update({
        lunch_start: now,
        updated_at: now,
      })
      .eq("id", attendance.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async endLunchBreak(userId: string): Promise<AttendanceRecord> {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data: attendance } = await supabase
      .from("attendance")
      .select()
      .eq("user_id", userId)
      .eq("date", new Date().toISOString().split("T")[0])
      .single()

    if (!attendance) {
      throw new Error("No attendance record found")
    }

    if (!attendance.lunch_start) {
      throw new Error("Lunch break not started")
    }

    const { data, error } = await supabase
      .from("attendance")
      .update({
        lunch_end: now,
        updated_at: now,
      })
      .eq("id", attendance.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async getTodayAttendance(userId: string): Promise<AttendanceRecord | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("attendance")
      .select()
      .eq("user_id", userId)
      .eq("date", new Date().toISOString().split("T")[0])
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows found"
      throw error
    }

    return data
  }

  async getAttendanceHistory(userId: string, startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("attendance")
      .select()
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false })

    if (error) throw error
    return data || []
  }

  async getTeamAttendance(date: string): Promise<any[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("attendance")
      .select(`*
        user:users(full_name, email, role)
      `)
      .eq("date", date)
      .order("check_in", { ascending: false })

    if (error) throw error
    return data || []
  }

  async getBreakTypes(): Promise<any[]> {
    const supabase = await createClient()

    const { data, error } = await supabase.from("break_types").select().eq("is_active", true).order("name")

    if (error) throw error
    return data || []
  }
}

export const attendanceService = AttendanceService.getInstance()
