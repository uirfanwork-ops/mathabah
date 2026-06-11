"use client";

import { useMemo, useState, useTransition } from "react";

import { createAssessment, recordGrades } from "@/lib/teacher/actions";
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
import { Textarea } from "@/components/ui/textarea";

interface Assessment {
  id: string;
  name: string;
  max_score: number;
}

interface GradeEntryProps {
  courseId: string;
  assessments: Assessment[];
  enrollments: {
    id: string;
    student: { id: string; full_name: string } | null;
  }[];
  // grades keyed as `${enrollment_id}:${assessment_id}` → { score, feedback }
  existingGrades: Record<
    string,
    { score: number | null; feedback: string | null }
  >;
}

export function GradeEntry({
  courseId,
  assessments,
  enrollments,
  existingGrades,
}: GradeEntryProps) {
  const [isPending, startTransition] = useTransition();
  const [creating, startCreating] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>(
    assessments[0]?.id ?? "",
  );

  const selectedAssessment = useMemo(
    () => assessments.find((a) => a.id === selectedAssessmentId) ?? null,
    [assessments, selectedAssessmentId],
  );

  return (
    <div className="space-y-6">
      {/* Create new assessment */}
      <form
        action={(formData) => {
          formData.set("course_id", courseId);
          setMessage(null);
          startCreating(async () => {
            try {
              await createAssessment(formData);
              (
                document.getElementById("assessment-form") as HTMLFormElement
              )?.reset();
              setMessage("Assessment created.");
            } catch (e) {
              setMessage(e instanceof Error ? e.message : "Failed");
            }
          });
        }}
        id="assessment-form"
        className="rounded-lg border border-brand-gold/15 bg-brand-ink/30 p-4"
      >
        <div className="mb-3 text-xs uppercase tracking-wider text-brand-gold/70">
          Create assessment
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Quiz 1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max_score">Max score</Label>
            <Input
              id="max_score"
              name="max_score"
              type="number"
              defaultValue={100}
              min={1}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight">Weight</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              step="0.1"
              defaultValue={1}
              min={0}
            />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due_date">Due date</Label>
            <Input id="due_date" name="due_date" type="date" />
          </div>
        </div>
        <div className="mt-3">
          <Button type="submit" size="sm" variant="secondary" disabled={creating}>
            {creating ? "Creating…" : "Add assessment"}
          </Button>
        </div>
      </form>

      {/* Grade entry */}
      {assessments.length === 0 ? (
        <div className="rounded-md border border-brand-gold/15 bg-brand-ink/30 p-6 text-center text-sm text-muted-foreground">
          Create an assessment above to start entering grades.
        </div>
      ) : (
        <form
          action={(formData) => {
            setMessage(null);
            formData.set("course_id", courseId);
            formData.set("assessment_id", selectedAssessmentId);
            startTransition(async () => {
              try {
                await recordGrades(formData);
                setMessage("Grades saved.");
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Failed");
              }
            });
          }}
          className="space-y-4"
        >
          <div className="flex items-end gap-3">
            <div className="min-w-[220px] space-y-1.5">
              <Label htmlFor="assessment_id">Assessment</Label>
              <Select
                id="assessment_id"
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (out of {a.max_score})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="w-32">
                  Score (/ {selectedAssessment?.max_score ?? "—"})
                </TableHead>
                <TableHead>Feedback</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.length === 0 ? (
                <TableEmpty colSpan={3}>
                  No students enrolled in this course.
                </TableEmpty>
              ) : (
                enrollments.map((e) => {
                  const key = `${e.id}:${selectedAssessmentId}`;
                  const existing = existingGrades[key];
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium text-brand-ink">
                        {e.student?.full_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Input
                          key={key}
                          name={`score_${e.id}`}
                          type="number"
                          step="0.01"
                          defaultValue={existing?.score ?? ""}
                          max={selectedAssessment?.max_score ?? undefined}
                          min={0}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          key={`f-${key}`}
                          name={`feedback_${e.id}`}
                          defaultValue={existing?.feedback ?? ""}
                          placeholder="Optional feedback"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {message && (
            <Alert
              variant={
                message === "Grades saved." || message === "Assessment created."
                  ? "success"
                  : "destructive"
              }
            >
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" variant="secondary" disabled={isPending}>
            {isPending ? "Saving…" : "Save grades"}
          </Button>
        </form>
      )}
    </div>
  );
}
