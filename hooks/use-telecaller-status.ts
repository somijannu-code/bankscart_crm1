import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function useTelecallerStatus(telecallerIds: string[]) {
  const [telecallerStatus, setTelecallerStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (telecallerIds.length === 0) {
      setTelecallerStatus({});
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      setLoading(true);
      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch attendance records for all telecallers for today
        const { data: attendanceRecords, error } = await supabase
          .from("attendance")
          .select("user_id, check_in")
          .eq("date", today)
          .in("user_id", telecallerIds);

        if (error) {
          console.error("Error fetching attendance records:", error);
          setTelecallerStatus({});
          return;
        }

        // Create a map of telecaller ID to checked-in status
        const statusMap: Record<string, boolean> = {};
        telecallerIds.forEach(id => {
          statusMap[id] = false; // Default to not checked in
        });

        // Update status for telecallers who have checked in
        attendanceRecords.forEach(record => {
          if (record.check_in) {
            statusMap[record.user_id] = true;
          }
        });

        setTelecallerStatus(statusMap);
      } catch (error) {
        console.error("Error checking telecaller status:", error);
        setTelecallerStatus({});
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [telecallerIds]);

  return { telecallerStatus, loading };
}