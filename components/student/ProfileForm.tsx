"use client";

import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateStudentProfile } from "@/lib/student/actions";

interface ProfileFormProps {
  profile: {
    full_name: string;
    phone: string | null;
  };
  student: {
    date_of_birth: string | null;
    gender: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    guardian_email: string | null;
    emergency_contact: string | null;
  };
}

export function ProfileForm({ profile, student }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          try {
            await updateStudentProfile(formData);
            setMessage("Saved.");
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Failed to save.");
          }
        });
      }}
      className="space-y-6"
    >
      <section className="space-y-4">
        <h3 className="font-serif text-lg text-brand-goldlight">
          Personal details
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            name="full_name"
            label="Full name"
            defaultValue={profile.full_name}
            required
          />
          <Field
            name="phone"
            label="Phone"
            defaultValue={profile.phone}
          />
          <Field
            name="date_of_birth"
            label="Date of birth"
            type="date"
            defaultValue={student.date_of_birth}
          />
          <Field name="gender" label="Gender" defaultValue={student.gender} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-serif text-lg text-brand-goldlight">Address</h3>
        <div className="space-y-2">
          <Label htmlFor="address">Street address</Label>
          <Textarea
            id="address"
            name="address"
            defaultValue={student.address ?? ""}
            rows={2}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="city" label="City" defaultValue={student.city} />
          <Field name="country" label="Country" defaultValue={student.country} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-serif text-lg text-brand-goldlight">
          Guardian &amp; emergency
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
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
      </section>

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
  required = false,
}: {
  name: string;
  label: string;
  defaultValue: string | null;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
      />
    </div>
  );
}
