"use client";

import { useState, useTransition } from "react";

import { updateTeacher } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TeacherFormProps {
  teacher: {
    id: string;
    employee_number: string | null;
    bio: string | null;
    specialization: string | null;
    qualifications: string | null;
    hire_date: string | null;
  };
}

export function TeacherForm({ teacher }: TeacherFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          try {
            await updateTeacher(formData);
            setMessage("Saved.");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Failed to save.");
          }
        });
      }}
      className="space-y-4"
    >
      <input type="hidden" name="teacher_id" value={teacher.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employee_number">Employee number</Label>
          <Input
            id="employee_number"
            name="employee_number"
            defaultValue={teacher.employee_number ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hire_date">Hire date</Label>
          <Input
            id="hire_date"
            name="hire_date"
            type="date"
            defaultValue={teacher.hire_date ?? ""}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="specialization">Specialization</Label>
          <Input
            id="specialization"
            name="specialization"
            defaultValue={teacher.specialization ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qualifications">Qualifications</Label>
        <Textarea
          id="qualifications"
          name="qualifications"
          rows={2}
          defaultValue={teacher.qualifications ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Biography</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={4}
          defaultValue={teacher.bio ?? ""}
        />
      </div>

      {message && (
        <Alert variant={message === "Saved." ? "success" : "destructive"}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
