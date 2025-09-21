"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function DetailedReport() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Report</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          This is a placeholder for the detailed attendance report.
        </p>
      </CardContent>
    </Card>
  );
}
