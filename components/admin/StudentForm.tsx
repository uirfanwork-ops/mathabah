"use client";

import { useState, useTransition } from "react";

import { updateStudent } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StudentFormProps {
  student: {
    id: string;
    student_number: string | null;
    date_of_birth: string | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    guardian_email: string | null;
    emergency_contact: string | null;
    notes: string | null;
  };
}

export function StudentForm({ student }: StudentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          try {
            await updateStudent(formData);
            setMessage("Saved.");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Failed to save.");
          }
        });
      }}
      className="space-y-4"
    >
      <input type="hidden" name="student_id" value={student.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          name="student_number"
          label="Student number"
          defaultValue={student.student_number}
        />
        <Field
          name="date_of_birth"
          label="Date of birth"
          type="date"
          defaultValue={student.date_of_birth}
        />
        <Field name="gender" label="Gender" defaultValue={student.gender} />
        <Field name="city" label="City" defaultValue={student.city} />
        <Field name="country" label="Country" defaultValue={student.country} />
        <Field
          name="guardian_name"
          label="Guardian name"
          defaultValue={student.guardian_name}
        />
        <Field
          name="guardian_phone"
          label="Guardian phone"
          defaultValue={student.guardian_phone}
        />
        <Field
          name="guardian_email"
          label="Guardian email"
          type="email"
          defaultValue={student.guardian_email}
        />
        <Field
          name="emergency_contact"
          label="Emergency contact"
          defaultValue={student.emergency_contact}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          name="address"
          defaultValue={student.address ?? ""}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={student.notes ?? ""}
          rows={3}
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

function Field({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} />
    </div>
  );
}
