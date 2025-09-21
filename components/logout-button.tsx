"use client"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2 bg-transparent">
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  )
}
