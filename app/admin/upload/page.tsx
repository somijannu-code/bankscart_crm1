"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Telecaller {
  id: string
  full_name: string
  email: string
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [telecallers, setTelecallers] = useState<Telecaller[]>([])
  const [selectedTelecaller, setSelectedTelecaller] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<{
    success: number
    errors: Array<{ row: number; error: string }>
  } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchTelecallers()
    getCurrentUser()
  }, [])

  const fetchTelecallers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("role", "telecaller")
        .eq("is_active", true)
        .order("full_name")

      if (error) {
        console.error("Error fetching telecallers:", error)
        return
      }

      if (data) {
        setTelecallers(data)
      }
    } catch (error) {
      console.error("Error fetching telecallers:", error)
    }
  }

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    } catch (error) {
      console.error("Error getting current user:", error)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
      setUploadResult(null)
    } else {
      alert("Please select a valid CSV file")
    }
  }

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.split("\n").filter((line) => line.trim())
    if (lines.length < 2) return []

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim())
      const row: Record<string, string> = {}

      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })

      data.push(row)
    }

    return data
  }

  const validateLead = (lead: Record<string, string>, rowIndex: number) => {
    const errors = []

    if (!lead.name || lead.name.trim() === "") {
      errors.push(`Row ${rowIndex}: Name is required`)
    }

    if (!lead.phone || lead.phone.trim() === "") {
      errors.push(`Row ${rowIndex}: Phone is required`)
    }

    if (lead.email && !lead.email.includes("@")) {
      errors.push(`Row ${rowIndex}: Invalid email format`)
    }

    return errors
  }

  const uploadLeads = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadResult(null)

    try {
      const text = await file.text()
      const leads = parseCSV(text)

      const errors: Array<{ row: number; error: string }> = []
      const validLeads = []

      // Validate each lead
      leads.forEach((lead, index) => {
        const leadErrors = validateLead(lead, index + 2) // +2 because of header and 0-based index
        if (leadErrors.length > 0) {
          errors.push(...leadErrors.map((error) => ({ row: index + 2, error })))
        } else {
          validLeads.push({
            name: lead.name,
            email: lead.email || null,
            phone: lead.phone,
            company: lead.company || null,
            designation: lead.designation || null,
            source: lead.source || "other",
            priority: lead.priority || "medium",
            address: lead.address || null,
            city: lead.city || null,
            state: lead.state || null,
            country: lead.country || null,
            zip_code: lead.zip_code || null,
            notes: lead.notes || null,
            assigned_to: selectedTelecaller || null,
            assigned_by: currentUserId || null,
            assigned_at: selectedTelecaller ? new Date().toISOString() : null,
          })
        }
      })

      // Insert valid leads
      let successCount = 0
      if (validLeads.length > 0) {
        const { data, error } = await supabase.from("leads").insert(validLeads).select()

        if (error) {
          errors.push({ row: 0, error: `Database error: ${error.message}` })
        } else {
          successCount = data?.length || 0
        }
      }

      setUploadResult({
        success: successCount,
        errors: errors,
      })

      if (successCount > 0) {
        setTimeout(() => {
          router.push("/admin/leads")
        }, 3000)
      }
    } catch (error) {
      console.error("Upload error:", error)
      setUploadResult({
        success: 0,
        errors: [{ row: 0, error: "Failed to process file" }],
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const template = `name,email,phone,company,designation,source,priority,address,city,state,country,zip_code,notes
John Doe,john@example.com,+1234567890,Acme Corp,Manager,website,high,123 Main St,New York,NY,USA,10001,Interested in our services
Jane Smith,jane@example.com,+1987654321,Tech Inc,Director,referral,medium,456 Oak Ave,Los Angeles,CA,USA,90001,Follow up next week`

    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "leads_template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Leads</h1>
          <p className="text-gray-600 mt-1">Bulk import leads from CSV file</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate} className="flex items-center gap-2 bg-transparent">
          <Download className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="csv-file">Select CSV File</Label>
              <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} className="mt-2" />
              <p className="text-sm text-gray-600 mt-1">Only CSV files are supported. Maximum file size: 10MB</p>
            </div>

            <div>
              <Label htmlFor="telecaller">Assign to Telecaller (Optional)</Label>
              <Select value={selectedTelecaller || ""} onValueChange={(value) => setSelectedTelecaller(value || null)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select a telecaller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">None (Unassigned)</SelectItem>
                  {telecallers.map((telecaller) => (
                    <SelectItem key={telecaller.id} value={telecaller.id}>
                      {telecaller.full_name} ({telecaller.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-1">
                All leads will be automatically assigned to the selected telecaller
              </p>
            </div>

            {file && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-sm text-gray-600">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
              </div>
            )}

            <Button onClick={uploadLeads} disabled={!file || isUploading} className="w-full">
              {isUploading ? "Uploading..." : "Upload Leads"}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>CSV Format Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Required Columns:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>name</strong> - Lead's full name
                </li>
                <li>
                  • <strong>phone</strong> - Contact phone number
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Optional Columns:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • <strong>email</strong> - Email address
                </li>
                <li>
                  • <strong>company</strong> - Company name
                </li>
                <li>
                  • <strong>designation</strong> - Job title
                </li>
                <li>
                  • <strong>source</strong> - Lead source (website, referral, etc.)
                </li>
                <li>
                  • <strong>priority</strong> - Priority level (low, medium, high, urgent)
                </li>
                <li>
                  • <strong>address, city, state, country, zip_code</strong> - Location info
                </li>
                <li>
                  • <strong>notes</strong> - Additional notes
                </li>
              </ul>
            </div>

            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <strong>Tip:</strong> Download the template file to see the exact format required.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Results */}
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {uploadResult.success > 0 ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              Upload Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadResult.success > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800">
                  Successfully uploaded {uploadResult.success} leads!
                  {selectedTelecaller && selectedTelecaller !== "unassigned" && " All leads assigned to selected telecaller."}
                  {uploadResult.success > 0 && " Redirecting to leads page..."}
                </p>
              </div>
            )}

            {uploadResult.errors.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 font-semibold mb-2">{uploadResult.errors.length} errors found:</p>
                <ul className="text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                  {uploadResult.errors.map((error, index) => (
                    <li key={index}>• {error.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
