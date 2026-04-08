"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { submitTeacherReport } from "@/lib/teacher/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface StudentOption {
  id: string;
  full_name: string;
  course_label: string | null;
}

interface CourseOption {
  id: string;
  name: string;
  code: string | null;
}

interface ReportFormProps {
  students: StudentOption[];
  courses: CourseOption[];
  defaultStudentId?: string;
  defaultCourseId?: string;
}

export function ReportForm({
  students,
  courses,
  defaultStudentId,
  defaultCourseId,
}: ReportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"mid_course" | "end_of_course" | "concern">(
    "mid_course",
  );

  return (
    <form
      action={(formData) => {
        setError(null);
        formData.set("type", type);
        startTransition(async () => {
          try {
            await submitTeacherReport(formData);
            router.replace("/teacher/reports");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="student_id">Student</Label>
          <Select
            id="student_id"
            name="student_id"
            required
            defaultValue={defaultStudentId ?? ""}
          >
            <option value="" disabled>
              Select a student…
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
                {s.course_label ? ` (${s.course_label})` : ""}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="course_id">Course (optional)</Label>
          <Select
            id="course_id"
            name="course_id"
            defaultValue={defaultCourseId ?? ""}
          >
            <option value="">— No specific course —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code ? `${c.code} — ` : ""}
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Report type</Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { value: "mid_course", label: "Mid-course" },
                { value: "end_of_course", label: "End of course" },
                { value: "concern", label: "Concern (notify admin)" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
                  type === opt.value
                    ? opt.value === "concern"
                      ? "border-brand-red bg-brand-red/15 text-brand-red"
                      : "border-brand-gold bg-brand-gold/15 text-brand-goldlight"
                    : "border-brand-gold/20 text-muted-foreground hover:border-brand-gold/40 hover:text-brand-goldlight"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            placeholder="Mid-course summary"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            name="content"
            required
            rows={8}
            placeholder="Detailed observations, progress, recommendations…"
          />
        </div>

        <div className="md:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_visible_to_student"
              className="h-4 w-4 rounded border-brand-gold/40 bg-input accent-brand-gold"
            />
            <span className="text-foreground/90">
              Make this report visible to the student
            </span>
          </label>
          {type === "concern" && (
            <p className="mt-2 text-xs text-brand-red">
              A concern report also creates an admin notification.
            </p>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "Submitting…" : "Submit report"}
      </Button>
    </form>
  );
}
