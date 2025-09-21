"use client";

import { useState } from "react";
import { PayrollIntegrationReport } from "@/components/PayrollIntegrationReport";
import { SummaryReport } from "@/components/SummaryReport";
import { DetailedReport } from "@/components/DetailedReport";
import { TrendsReport } from "@/components/TrendsReport";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AttendanceReportsPageClient() {
  const [view, setView] = useState<"summary" | "detailed" | "trends" | "payroll">("payroll");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Reports</h1>
          <p className="text-muted-foreground">
            Analyze attendance trends and patterns
          </p>
        </div>

        <div className="flex gap-2">
          <Select value={view} onValueChange={(val) => setView(val as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
              <SelectItem value="trends">Trends</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">Export</Button>
        </div>
      </div>

      {view === "summary" && <SummaryReport />}
      {view === "detailed" && <DetailedReport />}
      {view === "trends" && <TrendsReport />}
      {view === "payroll" && <PayrollIntegrationReport />}
    </div>
  );
}
