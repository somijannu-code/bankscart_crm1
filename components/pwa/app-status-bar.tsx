"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, Battery, Signal } from "lucide-react"

interface NetworkInfo {
  online: boolean
  effectiveType?: string
  downlink?: number
  rtt?: number
}

interface BatteryInfo {
  level: number
  charging: boolean
}

export function AppStatusBar() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({ online: navigator.onLine })
  const [batteryInfo, setBatteryInfo] = useState<BatteryInfo | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    // Network status
    const updateNetworkInfo = () => {
      const connection =
        (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

      setNetworkInfo({
        online: navigator.onLine,
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      })
    }

    const handleOnline = () => updateNetworkInfo()
    const handleOffline = () => updateNetworkInfo()

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Battery status
    const updateBatteryInfo = async () => {
      try {
        if ("getBattery" in navigator) {
          const battery = await (navigator as any).getBattery()
          setBatteryInfo({
            level: battery.level,
            charging: battery.charging,
          })

          const handleBatteryChange = () => {
            setBatteryInfo({
              level: battery.level,
              charging: battery.charging,
            })
          }

          battery.addEventListener("levelchange", handleBatteryChange)
          battery.addEventListener("chargingchange", handleBatteryChange)
        }
      } catch (error) {
        console.log("Battery API not supported")
      }
    }

    // Time updates
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    updateNetworkInfo()
    updateBatteryInfo()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(timeInterval)
    }
  }, [])

  // Only show on mobile in standalone mode
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone

  if (!isStandalone) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between px-4 py-2 text-xs">
        {/* Left side - Time */}
        <div className="font-medium">{currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>

        {/* Right side - Status indicators */}
        <div className="flex items-center gap-2">
          {/* Network status */}
          <div className="flex items-center gap-1">
            {networkInfo.online ? (
              <Wifi className="h-3 w-3 text-green-600" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-600" />
            )}
            {networkInfo.effectiveType && (
              <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
                {networkInfo.effectiveType.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Signal strength (mock) */}
          <Signal className="h-3 w-3 text-muted-foreground" />

          {/* Battery status */}
          {batteryInfo && (
            <div className="flex items-center gap-1">
              <Battery
                className={`h-3 w-3 ${
                  batteryInfo.charging
                    ? "text-green-600"
                    : batteryInfo.level > 0.2
                      ? "text-muted-foreground"
                      : "text-red-600"
                }`}
              />
              <span className="text-xs">{Math.round(batteryInfo.level * 100)}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
