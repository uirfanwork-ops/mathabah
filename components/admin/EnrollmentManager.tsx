"use client";

import { useState, useTransition } from "react";

import { createEnrollment, deleteEnrollment } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface EnrollmentRow {
  id: string;
  status: string;
  enrolled_at: string;
  course: { id: string; name: string; code: string | null } | null;
}

interface EnrollmentManagerProps {
  studentId: string;
  enrollments: EnrollmentRow[];
  availableCourses: { id: string; name: string; code: string | null }[];
}

export function EnrollmentManager({
  studentId,
  enrollments,
  availableCourses,
}: EnrollmentManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <form
        action={(formData) => {
          setError(null);
          formData.set("student_id", studentId);
          startTransition(async () => {
            try {
              await createEnrollment(formData);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed");
            }
          });
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-[260px] flex-1 space-y-2">
          <label className="text-xs uppercase tracking-wider text-brand-gold/70">
            Enroll in course
          </label>
          <Select name="course_id" required defaultValue="">
            <option value="" disabled>
              Select a course…
            </option>
            {availableCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} — ` : ""}
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "Enrolling…" : "Enroll"}
        </Button>
        {error && <span className="text-xs text-red-300">{error}</span>}
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Enrolled</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {enrollments.length === 0 ? (
            <TableEmpty colSpan={4}>Not enrolled in any courses yet.</TableEmpty>
          ) : (
            enrollments.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium text-brand-goldlight">
                  {e.course?.code ? `${e.course.code} — ` : ""}
                  {e.course?.name ?? "Unknown course"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      e.status === "active"
                        ? "success"
                        : e.status === "completed"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {e.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(e.enrolled_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <form
                    action={(formData) => {
                      formData.set("id", e.id);
                      formData.set("student_id", studentId);
                      startTransition(async () => {
                        try {
                          await deleteEnrollment(formData);
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : "Failed",
                          );
                        }
                      });
                    }}
                  >
                    <Button
                      type="submit"
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </form>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
