import { NextResponse } from "next/server";

import { resendConfirmationFor } from "@/lib/auth/email-confirmation";

export const runtime = "nodejs";

/** POST { email } — always answers ok so addresses can't be probed. */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = String(body?.email ?? "");
  } catch {
    // fall through
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    try {
      await resendConfirmationFor(email);
    } catch (e) {
      console.error("[resend-confirmation] failed", e);
    }
  }
  return NextResponse.json({ ok: true });
}
