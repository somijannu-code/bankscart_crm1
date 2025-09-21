"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PayrollRow {
  id: string;
  name: string;
  department: string;
  present: number;
  absent: number;
  workingHours: number;
  overtimeHours: number;
  baseSalary: number;
  overtimeRate: number;
  totalPay: number;
}

export function PayrollIntegrationReport() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSalary, setNewSalary] = useState<number>(0);
  const supabase = createClient();

  useEffect(() => {
    loadPayroll();
  }, []);

  const loadPayroll = async () => {
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, full_name, department, base_salary");

    if (userError) {
      console.error("User fetch error:", userError);
      return;
    }

    const { data: attendance, error: attError } = await supabase
      .from("attendance")
      .select("user_id, check_in, check_out, status");

    if (attError) {
      console.error("Attendance fetch error:", attError);
      return;
    }

    const workingDays = 26;
    const overtimeRate = 200; // ₹200 per hour

    const map: { [id: string]: PayrollRow } = {};

    users?.forEach((u) => {
      map[u.id] = {
        id: u.id,
        name: u.full_name,
        department: u.department || "N/A",
        present: 0,
        absent: 0,
        workingHours: 0,
        overtimeHours: 0,
        baseSalary: u.base_salary || 25000,
        overtimeRate,
        totalPay: 0,
      };
    });

    attendance?.forEach((r) => {
      const emp = map[r.user_id];
      if (!emp) return;

      if (r.status === "absent") {
        emp.absent += 1;
      } else {
        emp.present += 1;
      }

      if (r.check_in && r.check_out) {
        const hrs =
          (new Date(r.check_out).getTime() -
            new Date(r.check_in).getTime()) /
          3600000;
        emp.workingHours += hrs;
        if (hrs > 8) {
          emp.overtimeHours += hrs - 8;
        }
      }
    });

    Object.values(map).forEach((emp) => {
      const perDay = emp.baseSalary / workingDays;
      const absentDeduction = emp.absent * perDay;
      const overtimePay = emp.overtimeHours * emp.overtimeRate;
      emp.totalPay = emp.baseSalary - absentDeduction + overtimePay;
    });

    setRows(Object.values(map));
  };

  const handleEdit = (row: PayrollRow) => {
    setEditingId(row.id);
    setNewSalary(row.baseSalary);
  };

  const handleSave = async (id: string) => {
    const { error } = await supabase
      .from("users")
      .update({ base_salary: newSalary })
      .eq("id", id);

    if (error) {
      console.error("Error updating salary:", error);
    }
    setEditingId(null);
    loadPayroll();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payroll Integration Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Employee</th>
                <th className="text-left p-2">Department</th>
                <th className="text-left p-2">Present</th>
                <th className="text-left p-2">Absent</th>
                <th className="text-left p-2">Working Hours</th>
                <th className="text-left p-2">Overtime</th>
                <th className="text-left p-2">Base Salary</th>
                <th className="text-left p-2">Overtime Pay</th>
                <th className="text-left p-2">Total Pay</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.department}</td>
                  <td className="p-2">{row.present}</td>
                  <td className="p-2">{row.absent}</td>
                  <td className="p-2">{row.workingHours.toFixed(1)}h</td>
                  <td className="p-2">{row.overtimeHours.toFixed(1)}h</td>
                  <td className="p-2">
                    {editingId === row.id ? (
                      <Input
                        type="number"
                        value={newSalary}
                        onChange={(e) =>
                          setNewSalary(Number(e.target.value))
                        }
                        className="w-24"
                      />
                    ) : (
                      `₹${row.baseSalary.toLocaleString()}`
                    )}
                  </td>
                  <td className="p-2">
                    ₹{(row.overtimeHours * row.overtimeRate).toFixed(0)}
                  </td>
                  <td className="p-2 font-bold">
                    ₹{row.totalPay.toFixed(0)}
                  </td>
                  <td className="p-2">
                    {editingId === row.id ? (
                      <Button size="sm" onClick={() => handleSave(row.id)}>
                        Save
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(row)}
                      >
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
