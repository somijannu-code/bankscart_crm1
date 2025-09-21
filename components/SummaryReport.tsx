"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function SummaryReport() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary Report</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This is a placeholder for the summary view of attendance.
        </p>
      </CardContent>
    </Card>
  );
}
