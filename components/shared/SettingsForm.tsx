"use client";

import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateOwnContact,
  updateOwnPassword,
} from "@/lib/profile/actions";

export interface SettingsProfile {
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
}

export function SettingsForm({ profile }: { profile: SettingsProfile }) {
  return (
    <div className="space-y-6">
      <ContactCard profile={profile} />
      <PasswordCard />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact details
// ─────────────────────────────────────────────────────────────────────────────
function ContactCard({ profile }: { profile: SettingsProfile }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact information</CardTitle>
        <CardDescription>
          Keep your name, phone and address up to date. Phone and address are
          required — staff may need them to reach you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) => {
            setMessage(null);
            startTransition(async () => {
              try {
                await updateOwnContact(formData);
                setMessage({ kind: "success", text: "Saved." });
              } catch (e) {
                setMessage({
                  kind: "error",
                  text: e instanceof Error ? e.message : "Failed to save.",
                });
              }
            });
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="full_name"
              label="Full name"
              defaultValue={profile.full_name}
              required
            />
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={profile.email}
                readOnly
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Email is managed by your login and can&apos;t be changed here.
              </p>
            </div>
            <Field
              name="phone"
              label="Phone"
              type="tel"
              defaultValue={profile.phone}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">
              Street address <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="address"
              name="address"
              defaultValue={profile.address ?? ""}
              rows={2}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="city"
              label="City"
              defaultValue={profile.city}
            />
            <Field
              name="country"
              label="Country"
              defaultValue={profile.country}
            />
          </div>

          {message && (
            <Alert
              variant={message.kind === "success" ? "success" : "destructive"}
            >
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Password change
// ─────────────────────────────────────────────────────────────────────────────
function PasswordCard() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>
          Enter a new password at least 8 characters long.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) => {
            setMessage(null);
            startTransition(async () => {
              try {
                await updateOwnPassword(formData);
                setMessage({ kind: "success", text: "Password updated." });
                // Clear the form inputs on success
                const form = document.getElementById(
                  "password-form",
                ) as HTMLFormElement | null;
                form?.reset();
              } catch (e) {
                setMessage({
                  kind: "error",
                  text: e instanceof Error ? e.message : "Failed to update.",
                });
              }
            });
          }}
          id="password-form"
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirm password</Label>
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </div>

          {message && (
            <Alert
              variant={message.kind === "success" ? "success" : "destructive"}
            >
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small field helper
// ─────────────────────────────────────────────────────────────────────────────
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
      <Label htmlFor={name}>
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </Label>
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
