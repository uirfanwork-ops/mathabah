"use client";

import { useState, useTransition } from "react";

import { updateCourse } from "@/lib/admin/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CourseEditFormProps {
  course: {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    schedule: string | null;
    capacity: number | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    program_id: string | null;
    teacher_id: string | null;
  };
  programs: { id: string; name: string }[];
  teachers: { id: string; full_name: string }[];
}

export function CourseEditForm({
  course,
  programs,
  teachers,
}: CourseEditFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await updateCourse(formData);
          } catch (e) {
            // Next.js redirects throw an internal error that bubbles up; don't
            // surface that to the user.
            const msg = e instanceof Error ? e.message : "Failed to save course";
            if (!msg.includes("NEXT_REDIRECT")) {
              setError(msg);
            }
          }
        });
      }}
      className="space-y-4"
    >
      <input type="hidden" name="id" value={course.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Course name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={course.name}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Course code</Label>
          <Input id="code" name="code" defaultValue={course.code ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="program_id">Program</Label>
          <Select
            id="program_id"
            name="program_id"
            defaultValue={course.program_id ?? ""}
          >
            <option value="">— No program —</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher_id">Teacher</Label>
          <Select
            id="teacher_id"
            name="teacher_id"
            defaultValue={course.teacher_id ?? ""}
          >
            <option value="">— Unassigned —</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="schedule">Schedule</Label>
          <Input
            id="schedule"
            name="schedule"
            defaultValue={course.schedule ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            defaultValue={course.capacity ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="start_date">Start date</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={course.start_date ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End date</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={course.end_date ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={course.description ?? ""}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={course.is_active}
          className="h-4 w-4"
        />
        Active
      </label>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
