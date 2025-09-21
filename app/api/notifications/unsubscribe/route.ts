import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json()
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Remove subscription from database
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", subscription.endpoint)

    if (error) {
      console.error("Error removing push subscription:", error)
      return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in unsubscribe endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
