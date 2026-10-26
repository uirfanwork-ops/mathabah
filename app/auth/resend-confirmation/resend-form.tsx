"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResendForm({ defaultEmail }: { defaultEmail: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    setSending(true);
    try {
      await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setSending(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <Alert variant="success">
        <AlertDescription>
          If that address has an unconfirmed account, a new confirmation link
          is on its way. Check your inbox and spam folder — it can take a
          minute to arrive.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit" className="w-full" disabled={sending}>
        {sending ? "Sending…" : "Send new confirmation email"}
      </Button>
    </form>
  );
}
