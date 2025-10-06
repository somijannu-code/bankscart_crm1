"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface PerformanceMetricsProps {
  userId: string
  conversionRate: number
  successRate: number
  avgCallDuration: number
}

export function PerformanceMetrics({ 
  conversionRate, 
  successRate, 
  avgCallDuration 
}: PerformanceMetricsProps) {
  const metrics = [
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      trend: conversionRate > 15 ? "up" : conversionRate < 10 ? "down" : "neutral",
      description: "Leads to successful calls"
    },
    {
      label: "Success Rate", 
      value: `${successRate}%`,
      trend: successRate > 80 ? "up" : successRate < 60 ? "down" : "neutral",
      description: "Task completion rate"
    },
    {
      label: "Avg Call Duration",
      value: `${avgCallDuration}m`,
      trend: avgCallDuration > 5 ? "up" : avgCallDuration < 3 ? "down" : "neutral",
      description: "Average call length"
    }
  ]

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center p-4 border rounded-lg bg-white">
              <div className="flex items-center justify-center gap-2 mb-2">
                {getTrendIcon(metric.trend)}
                <span className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">
                {metric.label}
              </div>
              <div className="text-xs text-gray-500">
                {metric.description}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
