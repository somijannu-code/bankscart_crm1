"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

interface SplashScreenProps {
  onComplete: () => void
  minDuration?: number
}

export function SplashScreen({ onComplete, minDuration = 2000 }: SplashScreenProps) {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
      onComplete()
    }, minDuration)

    return () => clearTimeout(timer)
  }, [onComplete, minDuration])

  if (!isLoading) return null

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
      <div className="text-center space-y-6">
        {/* App Logo/Icon */}
        <div className="w-24 h-24 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-2xl">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold text-white">BC</span>
          </div>
        </div>

        {/* App Name */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Bankscart CRM</h1>
          <p className="text-white/80 text-lg">Professional Lead Management</p>
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center justify-center gap-2 text-white/80">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading...</span>
        </div>

        {/* Version Info */}
        <div className="text-white/60 text-sm">Version 1.0.0</div>
      </div>
    </div>
  )
}
