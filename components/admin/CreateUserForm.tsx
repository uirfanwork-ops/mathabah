"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createUser } from "@/lib/admin/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Role = "student" | "teacher" | "admin";

const ROLE_REDIRECT: Record<Role, string> = {
  student: "/admin/students",
  teacher: "/admin/teachers",
  admin: "/admin/admins",
};

export function CreateUserForm({ role }: { role: Role }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await createUser(formData);
            router.push(ROLE_REDIRECT[role]);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create user.");
          }
        });
      }}
      className="space-y-8"
    >
      <input type="hidden" name="role" value={role} />

      {/* ── Account / login ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Login credentials
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="email" label="Email" type="email" required />
          <Field
            name="password"
            label="Password"
            type="password"
            required
            hint="Minimum 8 characters"
          />
        </div>
        <p className="text-xs text-neutral-500">
          The user will be able to log in immediately with this email and
          password. Email confirmation is skipped. Share the credentials with
          them securely.
        </p>
      </section>

      {/* ── Personal / contact ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
          Contact details
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field name="full_name" label="Full name" required />
          <Field name="phone" label="Phone number" type="tel" required />
          <Field name="city" label="City" />
          <Field name="country" label="Country" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">
            Address <span className="text-red-600">*</span>
          </Label>
          <Textarea id="address" name="address" rows={2} required />
        </div>
      </section>

      {/* ── Role-specific ───────────────────────────────────────────────── */}
      {role === "student" && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Student details
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="student_number" label="Student number" />
            <Field name="date_of_birth" label="Date of birth" type="date" />
            <Field name="gender" label="Gender" />
            <Field name="guardian_name" label="Guardian name" />
            <Field name="guardian_phone" label="Guardian phone" type="tel" />
            <Field
              name="guardian_email"
              label="Guardian email"
              type="email"
            />
            <Field name="emergency_contact" label="Emergency contact" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
        </section>
      )}

      {role === "teacher" && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">
            Teacher details
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field name="employee_number" label="Employee number" />
            <Field name="specialization" label="Specialization" />
            <Field name="hire_date" label="Hire date" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qualifications">Qualifications</Label>
            <Textarea id="qualifications" name="qualifications" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" rows={3} />
          </div>
        </section>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : `Create ${role}`}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </Label>
      <Input id={name} name={name} type={type} required={required} />
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}
