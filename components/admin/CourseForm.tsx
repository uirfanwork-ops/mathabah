"use client";

import { useState, useTransition } from "react";

import { createCourse } from "@/lib/admin/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CourseFormProps {
  programs: { id: string; name: string }[];
  teachers: { id: string; full_name: string }[];
}

export function CourseForm({ programs, teachers }: CourseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await createCourse(formData);
            (document.getElementById("create-course-form") as HTMLFormElement)?.reset();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create course");
          }
        });
      }}
      id="create-course-form"
      className="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Course name</Label>
          <Input id="name" name="name" required placeholder="Tafsīr 101" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Course code</Label>
          <Input id="code" name="code" placeholder="TAF101" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="program_id">Program</Label>
          <Select id="program_id" name="program_id" defaultValue="">
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
          <Select id="teacher_id" name="teacher_id" defaultValue="">
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
          <Input id="schedule" name="schedule" placeholder="Mon/Wed 10:00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" name="capacity" type="number" min={1} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="start_date">Start date</Label>
          <Input id="start_date" name="start_date" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End date</Label>
          <Input id="end_date" name="end_date" type="date" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Creating…" : "Create course"}
      </Button>
    </form>
  );
}
