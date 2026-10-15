import { NextResponse } from "next/server";

import { buildConfirmUrl } from "@/lib/auth/email-confirmation";
import {
  FIELD_LABELS,
  REQUIRED,
  STUDENT_FIELDS,
  TEACHER_FIELDS,
  type RequestedRole,
} from "@/lib/auth/registration";
import { sendEmailConfirmation } from "@/lib/resend";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/auth/register  { fullName, email, password }
 *
 * Creates the (unconfirmed) account server-side and sends the confirmation
 * email through Resend. The admin is only notified once the user clicks the
 * link (see lib/auth/email-confirmation.ts → onEmailConfirmed).
 */
export async function POST(request: Request) {
  let body: {
    fullName?: string;
    email?: string;
    password?: string;
    accountType?: string;
    details?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const fullName = (body.fullName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!fullName) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email is not valid." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const accountType: RequestedRole =
    body.accountType === "teacher" ? "teacher" : "student";
  if (body.accountType !== "teacher" && body.accountType !== "student") {
    return NextResponse.json(
      { error: "Please choose whether you are registering as a student or a teacher." },
      { status: 400 },
    );
  }
  const allowed = accountType === "teacher" ? TEACHER_FIELDS : STUDENT_FIELDS;
  const details: Record<string, string> = {};
  for (const k of allowed) {
    const v = String(body.details?.[k] ?? "").trim().slice(0, 2000);
    if (v) details[k] = v;
  }
  for (const k of REQUIRED[accountType]) {
    if (!details[k]) {
      return NextResponse.json(
        { error: `${FIELD_LABELS[k]} is required.` },
        { status: 400 },
      );
    }
  }

  const svc = createServiceRoleClient();
  const { data, error } = await svc.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        requested_role: accountType,
        registration: details,
      },
    },
  });

  if (error || !data?.user) {
    const msg = error?.message ?? "Could not create account.";
    const exists = /already|registered|exists/i.test(msg);
    return NextResponse.json(
      {
        error: exists
          ? "An account with this email already exists. Try signing in."
          : msg,
      },
      { status: exists ? 409 : 400 },
    );
  }

  // Phone lives on profiles; the rest stays in metadata until approval.
  if (details.phone) {
    await svc.from("profiles").update({ phone: details.phone }).eq("id", data.user.id);
  }

  const hashed = data.properties?.hashed_token;
  try {
    if (!hashed) throw new Error("No token returned");
    await sendEmailConfirmation({
      to: email,
      fullName,
      confirmUrl: buildConfirmUrl(hashed, "signup"),
    });
  } catch (e) {
    // The account exists; the user can use "Resend" on the login page.
    console.error("[register] confirmation email failed", e);
  }

  await svc.from("audit_logs").insert({
    actor_id: data.user.id,
    action: "register",
    entity_type: "profile",
    entity_id: data.user.id,
    metadata: { email, requested_role: accountType },
  });

  return NextResponse.json({ ok: true });
}
