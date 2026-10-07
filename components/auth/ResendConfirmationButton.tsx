"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function ResendConfirmationButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  async function resend() {
    setState("sending");
    try {
      await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setState("sent");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={resend}
      disabled={!email || state === "sending" || state === "sent"}
    >
      {state === "sending"
        ? "Sending…"
        : state === "sent"
          ? "Sent — check your inbox"
          : "Resend confirmation email"}
    </Button>
  );
}
