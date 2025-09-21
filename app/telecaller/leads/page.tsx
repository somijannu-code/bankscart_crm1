import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Filter } from "lucide-react"
import { TelecallerLeadsTable } from "@/components/telecaller-leads-table"
import { TelecallerLeadFilters } from "@/components/telecaller-lead-filters"
import { redirect } from "next/navigation"

interface SearchParams {
  status?: string
  priority?: string
  search?: string
}

export default async function TelecallerLeadsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Build query with filters for telecaller's assigned leads
  let query = supabase.from("leads").select("*").eq("assigned_to", user.id).order("created_at", { ascending: false })

  // Apply filters
  if (searchParams.status) {
    query = query.eq("status", searchParams.status)
  }
  if (searchParams.priority) {
    query = query.eq("priority", searchParams.priority)
  }
  if (searchParams.search) {
    query = query.or(
      `name.ilike.%${searchParams.search}%,email.ilike.%${searchParams.search}%,phone.ilike.%${searchParams.search}%,company.ilike.%${searchParams.search}%`,
    )
  }

  const { data: leads } = await query

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Leads</h1>
          <p className="text-gray-600 mt-1">Manage your assigned leads</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TelecallerLeadFilters />
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Assigned Leads ({leads?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TelecallerLeadsTable leads={leads || []} />
        </CardContent>
      </Card>
    </div>
  )
}
