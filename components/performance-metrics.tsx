// components/performance-metrics.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Target, AlertCircle } from "lucide-react"

interface PerformanceMetricsProps {
  totalLeads: number
  convertedLeads: number
  highPriorityLeads: number
  conversionRate: number
}

export function PerformanceMetrics({ 
  totalLeads, 
  convertedLeads, 
  highPriorityLeads, 
  conversionRate 
}: PerformanceMetricsProps) {
  const metrics = [
    {
      title: "Total Leads",
      value: totalLeads,
      icon: BarChart3,
      color: "bg-blue-500"
    },
    {
      title: "Converted",
      value: convertedLeads,
      icon: TrendingUp,
      color: "bg-green-500"
    },
    {
      title: "Conversion Rate",
      value: `${conversionRate.toFixed(1)}%`,
      icon: Target,
      color: "bg-purple-500"
    },
    {
      title: "High Priority",
      value: highPriorityLeads,
      icon: AlertCircle,
      color: "bg-red-500"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-full ${metric.color} text-white`}>
                <metric.icon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
