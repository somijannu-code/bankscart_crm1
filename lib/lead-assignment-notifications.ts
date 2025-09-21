"use client"

import { createClient } from "@/lib/supabase/client"
import { notificationService } from "@/lib/notification-service"
import { toast } from "sonner"

export interface LeadAssignmentNotification {
  leadId: string
  leadName: string
  leadPhone: string
  leadEmail?: string
  assignedTo: string
  assignedBy: string
  assignedAt: string
  priority?: string
  loanAmount?: number
  loanType?: string
}

export class LeadAssignmentNotificationManager {
  private supabase = createClient()

  // Send notification when lead is assigned
  async notifyLeadAssignment(notification: LeadAssignmentNotification): Promise<void> {
    try {
      console.log("Sending lead assignment notification:", notification)
      
      // Get assigned user details
      const { data: assignedUser, error: userError } = await this.supabase
        .from("users")
        .select("full_name, email, notification_preferences")
        .eq("id", notification.assignedTo)
        .single()

      if (userError || !assignedUser) {
        console.error("Error fetching assigned user:", userError)
        return
      }

      // Check if user has assignment notifications enabled
      const preferences = assignedUser.notification_preferences || {}
      if (preferences.assignment_notifications === false) {
        console.log("User has disabled assignment notifications")
        return // User has disabled assignment notifications
      }

      // Create notification content
      const title = "🎯 New Lead Assigned"
      const body = `${notification.leadName} has been assigned to you`
      const details = this.formatLeadDetails(notification)

      console.log("Showing browser notification")
      // Show browser notification
      await notificationService.showBrowserNotification({
        title,
        body: `${body}${details}`,
        tag: `lead-assignment-${notification.leadId}`,
        requireInteraction: true,
      })

      console.log("Showing toast notification")
      // Show toast notification
      toast.success(title, {
        description: `${body}${details}`,
        action: {
          label: "View Lead",
          onClick: () => {
            window.open(`/telecaller/leads/${notification.leadId}`, "_blank")
          },
        },
        duration: 8000,
      })

      // Send push notification if user has subscription
      await this.sendPushNotification(notification, assignedUser)

      // Store notification in database for history
      await this.storeNotificationHistory(notification, assignedUser)
    } catch (error) {
      console.error("Error sending lead assignment notification:", error)
    }
  }

  // Send push notification
  private async sendPushNotification(notification: LeadAssignmentNotification, user: any): Promise<void> {
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: notification.assignedTo,
          title: "🎯 New Lead Assigned",
          body: `${notification.leadName} has been assigned to you${this.formatLeadDetails(notification)}`,
          url: `/telecaller/leads/${notification.leadId}`,
          data: {
            type: "lead_assignment",
            leadId: notification.leadId,
            leadName: notification.leadName,
            leadPhone: notification.leadPhone,
            priority: notification.priority,
          },
        }),
      })

      if (!response.ok) {
        console.error("Failed to send push notification:", await response.text())
      }
    } catch (error) {
      console.error("Error sending push notification:", error)
    }
  }

  // Store notification in database for history tracking
  private async storeNotificationHistory(notification: LeadAssignmentNotification, user: any): Promise<void> {
    try {
      const { error } = await this.supabase.from("notification_history").insert({
        user_id: notification.assignedTo,
        type: "lead_assignment",
        title: "New Lead Assigned",
        message: `${notification.leadName} has been assigned to you`,
        data: {
          leadId: notification.leadId,
          leadName: notification.leadName,
          leadPhone: notification.leadPhone,
          assignedBy: notification.assignedBy,
          priority: notification.priority,
          loanAmount: notification.loanAmount,
          loanType: notification.loanType,
        },
        read: false,
        created_at: new Date().toISOString(),
      })

      if (error) {
        console.error("Error storing notification history:", error)
      }
    } catch (error) {
      console.error("Error storing notification history:", error)
    }
  }

  // Format lead details for notification
  private formatLeadDetails(notification: LeadAssignmentNotification): string {
    const details = []

    if (notification.priority && notification.priority !== "medium") {
      details.push(`Priority: ${notification.priority.toUpperCase()}`)
    }

    if (notification.loanAmount) {
      details.push(`Amount: ₹${notification.loanAmount.toLocaleString()}`)
    }

    if (notification.loanType) {
      details.push(`Type: ${notification.loanType}`)
    }

    return details.length > 0 ? ` (${details.join(", ")})` : ""
  }

  // Bulk notification for multiple assignments
  async notifyBulkAssignment(assignments: LeadAssignmentNotification[], assignedTo: string): Promise<void> {
    try {
      // Get assigned user details
      const { data: assignedUser, error: userError } = await this.supabase
        .from("users")
        .select("full_name, email, notification_preferences")
        .eq("id", assignedTo)
        .single()

      if (userError || !assignedUser) {
        console.error("Error fetching assigned user:", userError)
        return
      }

      // Check if user has assignment notifications enabled
      const preferences = assignedUser.notification_preferences || {}
      if (preferences.assignment_notifications === false) {
        return
      }

      const count = assignments.length
      const title = `🎯 ${count} New Leads Assigned`
      const body = `${count} leads have been assigned to you`

      // Show browser notification
      await notificationService.showBrowserNotification({
        title,
        body,
        tag: `bulk-assignment-${Date.now()}`,
        requireInteraction: true,
        // REMOVED ACTIONS - they are not supported in regular notifications
      })

      // Show toast notification
      toast.success(title, {
        description: body,
        action: {
          label: "View Leads",
          onClick: () => {
            window.open("/telecaller/leads", "_blank")
          },
        },
        duration: 8000,
      })

      // Send push notification
      await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: assignedTo,
          title,
          body,
          url: "/telecaller/leads",
          data: {
            type: "bulk_lead_assignment",
            count,
            leadIds: assignments.map((a) => a.leadId),
          },
        }),
      })
    } catch (error) {
      console.error("Error sending bulk assignment notification:", error)
    }
  }

  // Setup real-time subscription for lead assignments
  setupRealtimeSubscription(userId: string): void {
    console.log("Setting up real-time subscription for user:", userId)
    
    const channel = this.supabase
      .channel("lead-assignments")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "leads",
        },
        (payload: any) => {
          console.log("Received lead assignment UPDATE event:", payload)
          // Check if this is a new assignment to this user
          if (payload.new.assigned_to === userId && 
              (payload.old.assigned_to === null || payload.old.assigned_to !== userId)) {
            console.log("New lead assignment detected for user:", userId)
            this.handleRealtimeAssignment(payload.new)
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leads",
        },
        (payload: any) => {
          console.log("Received new lead INSERT event:", payload)
          // Check if the new lead is assigned to this user
          if (payload.new.assigned_to === userId) {
            console.log("New lead assigned to user on insert:", userId)
            this.handleRealtimeAssignment(payload.new)
          }
        },
      )
      .subscribe((status: any) => {
        console.log("Subscription status changed:", status)
        if (status === "SUBSCRIBED") {
          console.log("Successfully subscribed to lead assignments for user:", userId)
        }
      })
  }

  // Handle real-time assignment notification
  private async handleRealtimeAssignment(lead: any): Promise<void> {
    try {
      console.log("Handling real-time assignment for lead:", lead)
      
      // Get additional lead details if needed
      let leadDetails = lead;
      if (!lead.name || !lead.phone) {
        const { data, error } = await this.supabase
          .from("leads")
          .select("name, phone, email, priority, loan_amount, loan_type, assigned_by, assigned_at")
          .eq("id", lead.id)
          .single()
        
        if (!error && data) {
          leadDetails = { ...lead, ...data }
        }
      }
      
      const notification: LeadAssignmentNotification = {
        leadId: leadDetails.id,
        leadName: leadDetails.name || "Unknown Lead",
        leadPhone: leadDetails.phone || "No Phone",
        leadEmail: leadDetails.email,
        assignedTo: leadDetails.assigned_to,
        assignedBy: leadDetails.assigned_by || "System",
        assignedAt: leadDetails.assigned_at || new Date().toISOString(),
        priority: leadDetails.priority,
        loanAmount: leadDetails.loan_amount,
        loanType: leadDetails.loan_type,
      }

      await this.notifyLeadAssignment(notification)
    } catch (error) {
      console.error("Error handling real-time assignment:", error)
    }
  }

  // Test function to manually trigger a notification
  async testNotification(userId: string): Promise<void> {
    console.log("Testing notification for user:", userId)
    
    const testNotification: LeadAssignmentNotification = {
      leadId: "test-lead-id",
      leadName: "Test Lead",
      leadPhone: "+1234567890",
      assignedTo: userId,
      assignedBy: "System",
      assignedAt: new Date().toISOString(),
      priority: "high",
    }

    await this.notifyLeadAssignment(testNotification)
  }
}

export const leadAssignmentNotificationManager = new LeadAssignmentNotificationManager()
