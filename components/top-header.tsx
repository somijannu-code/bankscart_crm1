"use client"

import { NotificationCenter } from "@/components/notification-center"
import { Button } from "@/components/ui/button"
import { User, Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface TopHeaderProps {
  title?: string
  subtitle?: string
}

export function TopHeader({ title, subtitle }: TopHeaderProps) {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  return (
    <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <div>
        {title && <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>}
        {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <NotificationCenter />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <span className="text-sm font-medium text-gray-700">
            {user?.user_metadata?.full_name || user?.email || "User"}
          </span>
        </div>

        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
