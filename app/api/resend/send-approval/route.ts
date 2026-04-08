import { NextResponse } from "next/server";

import { sendNewRegistrationToAdmin } from "@/lib/resend";

export const runtime = "nodejs";

/**
 * POST /api/resend/send-approval
 *
 * Called by the register page right after Supabase signUp() succeeds.
 * Sends a notification to the admin inbox so they can review the new account
 * in the approvals dashboard.
 *
 * Body: { fullName: string, email: string, requestedRole?: string }
 */
export async function POST(request: Request) {
  let body: { fullName?: string; email?: string; requestedRole?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fullName = (body.fullName ?? "").trim();
  const email = (body.email ?? "").trim();

  if (!fullName || !email) {
    return NextResponse.json(
      { error: "fullName and email are required" },
      { status: 400 },
    );
  }

  try {
    const result = await sendNewRegistrationToAdmin({
      fullName,
      email,
      requestedRole: body.requestedRole,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("[send-approval] failed", error);
    return NextResponse.json(
      { error: "Failed to send admin notification" },
      { status: 500 },
    );
  }
}
