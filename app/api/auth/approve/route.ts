import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  sendApprovalRejection,
  sendApprovalWelcome,
} from "@/lib/resend";

export const runtime = "nodejs";

/**
 * POST /api/auth/approve
 *
 * Approves or rejects a pending profile. Caller must be authenticated as an
 * approved admin. Body: { profile_id, action: "approve" | "reject", role?, reason? }
 *
 * The same logic is exposed as server actions in lib/admin/actions.ts and used
 * by the approvals dashboard. This route exists for non-UI callers (CLI,
 * automation, etc.).
 */
export async function POST(request: Request) {
  // Verify caller is an approved admin
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();
  if (
    !adminProfile ||
    adminProfile.role !== "admin" ||
    adminProfile.status !== "approved"
  ) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: {
    profile_id?: string;
    action?: "approve" | "reject";
    role?: "admin" | "teacher" | "student";
    reason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.profile_id || !body.action) {
    return NextResponse.json(
      { error: "profile_id and action are required" },
      { status: 400 },
    );
  }

  const svc = createServiceRoleClient();

  const { data: target, error: fetchError } = await svc
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", body.profile_id)
    .single();
  if (fetchError || !target) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (body.action === "approve") {
    const role = body.role ?? target.role ?? "student";
    const { error: updateError } = await svc
      .from("profiles")
      .update({
        status: "approved",
        role,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", target.id);
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    if (role === "student") {
      await svc
        .from("students")
        .upsert({ profile_id: target.id }, { onConflict: "profile_id" });
    } else if (role === "teacher") {
      await svc
        .from("teachers")
        .upsert({ profile_id: target.id }, { onConflict: "profile_id" });
    }

    await svc.from("audit_logs").insert({
      actor_id: user.id,
      action: "approve_account",
      entity_type: "profile",
      entity_id: target.id,
      metadata: { role },
    });

    try {
      await sendApprovalWelcome({
        to: target.email,
        fullName: target.full_name,
        role,
      });
    } catch (e) {
      console.warn("[approve] welcome email failed", e);
    }

    return NextResponse.json({ ok: true, status: "approved", role });
  }

  if (body.action === "reject") {
    const { error: updateError } = await svc
      .from("profiles")
      .update({
        status: "rejected",
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", target.id);
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 },
      );
    }

    await svc.from("audit_logs").insert({
      actor_id: user.id,
      action: "reject_account",
      entity_type: "profile",
      entity_id: target.id,
      metadata: { reason: body.reason ?? null },
    });

    try {
      await sendApprovalRejection({
        to: target.email,
        fullName: target.full_name,
        reason: body.reason,
      });
    } catch (e) {
      console.warn("[approve] rejection email failed", e);
    }

    return NextResponse.json({ ok: true, status: "rejected" });
  }

  return NextResponse.json(
    { error: "action must be 'approve' or 'reject'" },
    { status: 400 },
  );
}
