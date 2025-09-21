import type React from "react"
import { AuthGuard } from "@/components/auth-guard"
import { AdminSidebar } from "@/components/admin-sidebar"
import { TopHeader } from "@/components/top-header"
import { CallTrackingProvider } from "@/context/call-tracking-context"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requiredRole="admin">
      <CallTrackingProvider>
        <div className="flex h-screen bg-gray-50">
          <AdminSidebar />
          <div className="flex-1 flex flex-col">
            <TopHeader title="Admin Dashboard" />
            <main className="flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
      </CallTrackingProvider>
    </AuthGuard>
  )
}