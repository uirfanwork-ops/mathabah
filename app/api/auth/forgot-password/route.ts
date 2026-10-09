import { NextResponse } from "next/server";

import { requestPasswordReset } from "@/lib/auth/password-reset";

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
      await requestPasswordReset(email);
    } catch (e) {
      console.error("[forgot-password] failed", e);
    }
  }
  return NextResponse.json({ ok: true });
}
