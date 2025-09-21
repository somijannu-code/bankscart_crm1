"use client"

import type React from "react"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useLeadAssignmentNotifications } from "@/hooks/use-lead-assignment-notifications"
import { notificationService } from "@/lib/notification-service"

interface NotificationProviderProps {
  children: React.ReactNode
  userId?: string
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const supabase = createClient()

  console.log("NotificationProvider rendered with userId:", userId)

  // Setup lead assignment notifications
  useLeadAssignmentNotifications(userId)

  useEffect(() => {
    console.log("NotificationProvider useEffect called with userId:", userId)
    
    if (!userId) {
      console.log("No userId provided, skipping notification setup")
      return
    }

    // Request notification permission on app load
    if (typeof window !== "undefined" && "Notification" in window) {
      console.log("Checking notification permission status:", Notification.permission)
      if (Notification.permission === "default") {
        console.log("Requesting notification permission in NotificationProvider")
        notificationService.requestPermission().then((permission) => {
          if (permission === "granted") {
            console.log("Notification permission granted in NotificationProvider")
          } else {
            console.log("Notification permission denied or dismissed in NotificationProvider")
          }
        })
      } else if (Notification.permission === "granted") {
        console.log("Notification permission already granted in NotificationProvider")
      } else {
        console.log("Notification permission previously denied in NotificationProvider")
      }
    }

    // Setup service worker for push notifications
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      console.log("Attempting to register service worker")
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }
  }, [userId])

  return <>{children}</>
}