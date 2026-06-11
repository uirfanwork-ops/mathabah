"use client";

import { useState, useTransition } from "react";

import { recordAttendance } from "@/lib/teacher/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AttendanceSheetProps {
  courseId: string;
  defaultDate?: string;
  enrollments: {
    id: string;
    student: { id: string; full_name: string } | null;
    existing?: { status: string; notes: string | null } | null;
  }[];
}

export function AttendanceSheet({
  courseId,
  defaultDate,
  enrollments,
}: AttendanceSheetProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [date, setDate] = useState(
    defaultDate ?? new Date().toISOString().slice(0, 10),
  );

  return (
    <form
      action={(formData) => {
        setMessage(null);
        formData.set("course_id", courseId);
        formData.set("session_date", date);
        startTransition(async () => {
          try {
            await recordAttendance(formData);
            setMessage("Attendance saved.");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
      className="space-y-4"
    >
      <div className="flex items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor="session_date">Session date</Label>
          <Input
            id="session_date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead className="w-40">Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.length === 0 ? (
            <TableEmpty colSpan={3}>
              No students enrolled in this course.
            </TableEmpty>
          ) : (
            enrollments.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium text-brand-ink">
                  {e.student?.full_name ?? "—"}
                </TableCell>
                <TableCell>
                  <Select
                    name={`status_${e.id}`}
                    defaultValue={e.existing?.status ?? "present"}
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    name={`notes_${e.id}`}
                    defaultValue={e.existing?.notes ?? ""}
                    placeholder="Optional"
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {message && (
        <Alert
          variant={message === "Attendance saved." ? "success" : "destructive"}
        >
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Saving…" : "Save attendance"}
      </Button>
    </form>
  );
}
