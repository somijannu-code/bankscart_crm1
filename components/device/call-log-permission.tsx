"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Phone, Shield, AlertCircle, CheckCircle } from "lucide-react"
import { callLogsManager } from "@/lib/device/call-logs"
import { toast } from "sonner"

interface CallLogPermissionProps {
  onPermissionGranted?: () => void
  onPermissionDenied?: () => void
}

export function CallLogPermission({ onPermissionGranted, onPermissionDenied }: CallLogPermissionProps) {
  const [permissionState, setPermissionState] = useState<PermissionState>("prompt")
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    checkPermissionStatus()
  }, [])

  const checkPermissionStatus = async () => {
    try {
      // Check if call logs API is available
      // @ts-ignore - TypeScript doesn't recognize static methods on instance
      const available = callLogsManager.isAvailable()
      setIsSupported(available)

      if (!available) {
        setPermissionState("denied")
        return
      }

      // For mobile devices, we'll set to "prompt" to encourage users to try
      setPermissionState("prompt")
    } catch (error) {
      console.error("Error checking call log permission status:", error)
      setPermissionState("denied")
      setIsSupported(false)
    }
  }

  const requestPermission = async () => {
    setIsLoading(true)
    try {
      // @ts-ignore - TypeScript doesn't recognize static methods on instance
      const result = await callLogsManager.requestPermission()
      setPermissionState(result)

      if (result === "granted") {
        toast.success("Call log access granted!", {
          description: "You can now track your calls automatically"
        })
        onPermissionGranted?.()
      } else if (result === "denied") {
        toast.error("Call log access not available", {
          description: "Automatic call tracking is not supported on your device. Manual logging is always available."
        })
        onPermissionDenied?.()
      } else {
        // For "prompt" state, show informational message
        toast.info("Call log access information", {
          description: "Some devices support automatic call logging. If available, you'll see a permission prompt. Manual logging is always available."
        })
      }
    } catch (error) {
      console.error("Error requesting call log permission:", error)
      toast.error("Failed to request call log permission", {
        description: "Please try again or check your device settings"
      })
      setPermissionState("denied")
      onPermissionDenied?.()
    } finally {
      setIsLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Call Log Access Information
          </CardTitle>
          <CardDescription>
            Automatic call log access has limitations on web browsers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>Manual call logging is always available and works on all devices</span>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Enhanced Manual Logging</h4>
            <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1 mb-3">
              <li>One-tap call initiation from lead details</li>
              <li>Automatic call duration tracking</li>
              <li>Quick note-taking during calls</li>
              <li>Seamless call log creation after calls</li>
            </ul>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                toast.info("Manual Logging Tips", {
                  description: "After making a call, return to this page to quickly log your call with duration and notes."
                })
              }}
            >
              View Logging Tips
            </Button>
          </div>
          
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-medium text-purple-800 mb-2">Native Mobile App (Recommended for Automatic Logging)</h4>
            <p className="text-sm text-purple-700 mb-3">
              For true automatic call logging, a native mobile app is required with proper permissions.
            </p>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  toast.info("Native App Development", {
                    description: "A native app would require Android/iOS development with call log permissions."
                  })
                }}
              >
                Learn About Native App Development
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call Log Access
        </CardTitle>
        <CardDescription>
          Allow access to your call logs for automatic tracking and reporting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Permission Status</span>
          </div>
          <Badge variant={permissionState === "granted" ? "default" : "secondary"}>
            {permissionState === "granted" ? (
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Granted
              </div>
            ) : permissionState === "denied" ? (
              "Denied"
            ) : (
              "Not Requested"
            )}
          </Badge>
        </div>

        {permissionState !== "granted" && (
          <Button 
            onClick={requestPermission} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Checking Access..." : "Check Call Log Access"}
          </Button>
        )}

        {permissionState === "granted" && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Call log access granted</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Your calls will be automatically tracked and logged
            </p>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            • Call log access helps automatically track your calls for reporting
          </p>
          <p>
            • Your call data is stored securely and never shared with third parties
          </p>
          <p className="text-blue-600 font-medium">
            • Manual call logging is always available and works on all devices
          </p>
        </div>
      </CardContent>
    </Card>
  )
}