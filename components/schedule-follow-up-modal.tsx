"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Lead {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
}

interface ScheduleFollowUpModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultLeadId?: string;
  defaultTime?: Date;
}

export function ScheduleFollowUpModal({ 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange,
  defaultLeadId,
  defaultTime
}: ScheduleFollowUpModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("09:00");
  const [leadId, setLeadId] = useState("");
  const [notes, setNotes] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;
  
  const supabase = createClient();
  const router = useRouter();

  // Set default values when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchLeads();
      
      // Set default values if provided
      if (defaultLeadId) {
        setLeadId(defaultLeadId);
      }
      
      if (defaultTime) {
        // Ensure we're working with a clean date object
        const cleanDate = new Date(defaultTime);
        cleanDate.setHours(0, 0, 0, 0); // Reset time part
        setDate(cleanDate);
        setTime(format(defaultTime, "HH:mm"));
      } else {
        // Set to tomorrow at 9 AM by default
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0); // Reset time part for clean date
        setDate(tomorrow);
        setTime("09:00");
      }
      
      // Debug logging
      console.log("Modal opened with default date:", defaultTime);
      console.log("Setting date to:", defaultTime || new Date(Date.now() + 86400000));
    } else {
      // Reset form when closing
      setLeadId("");
      setNotes("");
      setDate(undefined);
      setTime("09:00");
    }
  }, [isOpen, defaultLeadId, defaultTime]);

  const fetchLeads = async () => {
    setFetching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to schedule follow-ups");
        return;
      }

      // Fetch leads that the current user can assign follow-ups to
      const { data: leadsData, error } = await supabase
        .from("leads")
        .select("id, name, company, phone")
        .eq("assigned_to", user.id)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching leads:", error);
        toast.error("Failed to fetch leads");
        return;
      }

      setLeads(leadsData || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    } finally {
      setFetching(false);
    }
  };

  const handleSchedule = async () => {
    if (!date || !leadId) {
      toast.error("Please select a lead and date");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please sign in to schedule follow-ups");
        return;
      }

      // Find the selected lead to create a title
      const selectedLead = leads.find(lead => lead.id === leadId);
      const title = selectedLead ? `Follow-up with ${selectedLead.name}` : "Follow-up";

      // Debug logging
      console.log("Selected date:", date);
      console.log("Selected time:", time);
      console.log("Lead ID:", leadId);
      console.log("User ID:", user.id);

      // Create a proper datetime by combining date and time
      const scheduledDateTime = new Date(date);
      const [hours, minutes] = time.split(":").map(Number);
      scheduledDateTime.setHours(hours, minutes, 0, 0); // Set hours, minutes, seconds, milliseconds

      // Debug logging
      console.log("Combined datetime:", scheduledDateTime);
      console.log("ISO datetime:", scheduledDateTime.toISOString());

      // Check if the scheduled time is in the past
      const now = new Date();
      if (scheduledDateTime < now) {
        toast.error("Please select a future date and time");
        return;
      }

      console.log("Scheduling follow-up with datetime:", scheduledDateTime.toISOString());

      const { error } = await supabase
        .from("follow_ups")
        .insert({
          lead_id: leadId,
          user_id: user.id, // Changed from assigned_to to user_id
          title: title, // Added required title field
          scheduled_at: scheduledDateTime.toISOString(), // Changed from scheduled_time to scheduled_at
          notes: notes,
          status: "pending" // Changed from scheduled to pending
        });

      if (error) {
        console.error("Error scheduling follow-up:", error);
        toast.error("Failed to schedule follow-up: " + error.message);
        return;
      }

      toast.success("Follow-up scheduled successfully!");
      setOpen(false);
      
      // Refresh the page to show the new follow-up
      router.refresh();

    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while scheduling follow-up");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle date input change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      const selectedDate = new Date(dateValue);
      selectedDate.setHours(0, 0, 0, 0); // Reset time part
      setDate(selectedDate);
      console.log("Date changed:", selectedDate);
    } else {
      setDate(undefined);
    }
  };

  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Set min date to today for date input
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {!controlledOpen && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Follow-up
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule New Follow-up</DialogTitle>
          <DialogDescription>
            Set a reminder for a callback or follow-up activity.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="lead">Select Lead *</Label>
            <Select 
              value={leadId} 
              onValueChange={setLeadId} 
              disabled={fetching}
              defaultValue={defaultLeadId}
            >
              <SelectTrigger>
                <SelectValue placeholder={fetching ? "Loading leads..." : "Choose a lead"} />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name} {lead.company && `(${lead.company})`}
                  </SelectItem>
                ))}
                {leads.length === 0 && !fetching && (
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    No leads available
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                type="date"
                value={formatDateForInput(date)}
                onChange={handleDateChange}
                min={minDate}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => {
                  console.log("Time changed:", e.target.value);
                  setTime(e.target.value);
                }}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any specific notes for this follow-up..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSchedule} 
            disabled={!date || !leadId || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Schedule Follow-up"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}