"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, GraduationCap } from "lucide-react";

import { STUDENT_FIELDS, TEACHER_FIELDS } from "@/lib/auth/registration";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AccountType = "student" | "teacher";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!accountType) {
      setError("Please choose whether you are a student or a teacher.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("full_name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const fields = accountType === "teacher" ? TEACHER_FIELDS : STUDENT_FIELDS;
    const details: Record<string, string> = {};
    for (const k of fields) details[k] = String(formData.get(k) ?? "").trim();

    setSubmitting(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName, email, password, accountType, details }),
    });
    const result = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(result?.error ?? "Could not create account.");
      return;
    }

    startTransition(() => {
      router.replace(`/auth/check-email?email=${encodeURIComponent(email)}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">I am registering as a…</legend>
        <div className="grid grid-cols-2 gap-3">
          <TypeCard
            active={accountType === "student"}
            onClick={() => setAccountType("student")}
            icon={<BookOpen className="h-6 w-6" />}
            title="Student"
            hint="Enrol in programs & courses"
          />
          <TypeCard
            active={accountType === "teacher"}
            onClick={() => setAccountType("teacher")}
            icon={<GraduationCap className="h-6 w-6" />}
            title="Teacher"
            hint="Faculty & instructors"
          />
        </div>
      </fieldset>

      {accountType && (
        <>
          <Section title="Account">
            <Field name="full_name" label="Full name" required autoComplete="name" />
            <Field name="email" label="Email" type="email" required autoComplete="email" />
            <Field
              name="password"
              label="Password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            <Field name="phone" label="Phone" type="tel" required autoComplete="tel" />
          </Section>

          {accountType === "student" ? (
            <Section title="Student details">
              <Field name="date_of_birth" label="Date of birth" type="date" required />
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select id="gender" name="gender" defaultValue="">
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </Select>
              </div>
              <Field
                name="program_interest"
                label="Program you're interested in"
                placeholder="e.g. Tafsir, Islamic Essentials"
              />
              <Field
                name="guardian_name"
                label="Parent / guardian name (if under 18)"
              />
              <Field
                name="guardian_phone"
                label="Parent / guardian phone (if under 18)"
                type="tel"
              />
            </Section>
          ) : (
            <Section title="Teaching background">
              <Field
                name="specialization"
                label="Area of specialization"
                required
                placeholder="e.g. Tafsir, Fiqh, Arabic, Tajweed"
              />
              <Field
                name="subjects"
                label="Subjects you can teach"
                placeholder="e.g. Quran recitation, Hadith studies"
              />
              <Field
                name="years_experience"
                label="Years of teaching experience"
                type="number"
                min={0}
                required
              />
              <div className="space-y-2">
                <Label htmlFor="qualifications">
                  Qualifications / ijazahs <span className="text-brand-red">*</span>
                </Label>
                <Textarea
                  id="qualifications"
                  name="qualifications"
                  rows={3}
                  required
                  placeholder="Degrees, ijazahs, institutions studied at"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">About you / teaching background</Label>
                <Textarea id="bio" name="bio" rows={3} />
              </div>
            </Section>
          )}

          <p className="text-xs text-muted-foreground">
            After you confirm your email, an administrator reviews your
            registration and approves you as a{" "}
            {accountType === "teacher" ? "teacher" : "student"}.
          </p>

          <Button type="submit" className="w-full" disabled={submitting || isPending}>
            {submitting || isPending
              ? "Creating account…"
              : accountType === "teacher"
                ? "Apply as a teacher"
                : "Register as a student"}
          </Button>
        </>
      )}
    </form>
  );
}

function TypeCard({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border-2 p-4 text-center transition",
        active
          ? "border-brand-gold bg-brand-gold/10"
          : "border-border hover:border-brand-gold/50",
      )}
    >
      <span className="text-brand-gold">{icon}</span>
      <span className="font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-gold">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  name,
  label,
  required,
  ...rest
}: { name: string; label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-brand-red"> *</span>}
      </Label>
      <Input id={name} name={name} required={required} {...rest} />
    </div>
  );
}
