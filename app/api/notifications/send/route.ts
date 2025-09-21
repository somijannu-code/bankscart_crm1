import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import webpush from "web-push"

// Validate and configure web-push with VAPID keys
function configureWebPush() {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const vapidEmail = process.env.VAPID_EMAIL || "mailto:your-email@example.com"

  // Check if keys exist
  if (!vapidPublicKey || !vapidPrivateKey) {
    throw new Error("VAPID keys are not configured in environment variables")
  }

  // Use the keys directly without modification - web-push handles encoding
  webpush.setVapidDetails(
    vapidEmail,
    vapidPublicKey,
    vapidPrivateKey
  )
}

// Track web-push configuration status
let isWebPushConfigured = false

// Configure web-push at module level (runs once)
try {
  configureWebPush()
  isWebPushConfigured = true
  console.log("Web-push configured successfully")
} catch (error) {
  console.error("Failed to configure web-push:", error instanceof Error ? error.message : "Unknown error")
}

export async function POST(request: NextRequest) {
  try {
    // Check if web-push was configured successfully
    if (!isWebPushConfigured) {
      return NextResponse.json(
        { error: "Push notifications are not configured on the server" },
        { status: 500 }
      )
    }

    const { userId, title, body, url, data } = await request.json()
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    // Get current user (admin check)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const userRole = user.user_metadata?.role || user.app_metadata?.role
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get subscriptions for the target user (or all users if no userId specified)
    let query = supabase.from("push_subscriptions").select("*")

    if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data: subscriptions, error: subscriptionError } = await query

    if (subscriptionError) {
      console.error("Error fetching subscriptions:", subscriptionError)
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "No subscriptions found" }, { status: 200 })
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title: title || "Bankscart CRM",
      body: body || "You have a new notification",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      url: url || "/",
      data: data || {},
    })

    // Send notifications to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key,
          },
        }

        await webpush.sendNotification(pushSubscription, payload)
        return { success: true, endpoint: subscription.endpoint }
      } catch (error) {
        console.error("Failed to send notification to endpoint:", subscription.endpoint, error)

        // If subscription is invalid (410 status), remove it from database
        if (error instanceof Error && (error.message.includes("410") || error.message.includes("Gone"))) {
          try {
            await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint)
            console.log("Removed invalid subscription:", subscription.endpoint)
          } catch (deleteError) {
            console.error("Failed to remove invalid subscription:", deleteError)
          }
        }

        return {
          success: false,
          endpoint: subscription.endpoint,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    })

    const results = await Promise.all(sendPromises)
    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    return NextResponse.json({
      message: `Sent ${successful} notifications, ${failed} failed`,
      results,
    })
  } catch (error) {
    console.error("Error in send notification endpoint:", error)
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    )
  }
}

// Optional: Add GET method to check web-push configuration status
export async function GET() {
  return NextResponse.json({
    configured: isWebPushConfigured,
    message: isWebPushConfigured 
      ? "Web-push is configured correctly" 
      : "Web-push is not configured. Check VAPID keys in environment variables."
  })
}
