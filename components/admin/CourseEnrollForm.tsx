"use client";

import { useState, useTransition } from "react";

import { createEnrollment } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface CourseEnrollFormProps {
  courseId: string;
  availableStudents: {
    id: string;
    full_name: string;
    email: string;
    display_id: string | null;
  }[];
}

export function CourseEnrollForm({
  courseId,
  availableStudents,
}: CourseEnrollFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (availableStudents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        All students are already enrolled in this course.
      </p>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        formData.set("course_id", courseId);
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
          Enroll a student
        </label>
        <Select name="student_id" required defaultValue="">
          <option value="" disabled>
            Select a student…
          </option>
          {availableStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {s.display_id ? `${s.display_id} — ` : ""}
              {s.full_name} ({s.email})
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Enrolling…" : "Enroll"}
      </Button>
      {error && <span className="text-xs text-red-300">{error}</span>}
    </form>
  );
}
