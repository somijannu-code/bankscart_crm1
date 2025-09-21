import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AttendanceReports } from "@/components/attendance-reports";
export default async function AdminAttendanceReportsPage() {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login");
  }
  // Check if user is admin
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (userError || userData?.role !== "admin") {
    redirect("/admin");
  }
  return (
    <div className="p-6">
      <AttendanceReports />
    </div>
  );
}