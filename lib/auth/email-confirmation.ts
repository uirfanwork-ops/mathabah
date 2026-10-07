import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  sendEmailConfirmation,
  sendNewRegistrationToAdmin,
} from "@/lib/resend";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/** Link the user clicks; handled by app/auth/confirm/route.ts. */
export function buildConfirmUrl(
  tokenHash: string,
  type: "signup" | "magiclink",
) {
  const u = new URL("/auth/confirm", appUrl);
  u.searchParams.set("token_hash", tokenHash);
  u.searchParams.set("type", type);
  return u.toString();
}

/**
 * Re-send a confirmation link to an existing, still-unconfirmed account.
 * Never creates users and never reveals whether the address exists.
 * Throttled to one email per minute per account.
 */
export async function resendConfirmationFor(email: string) {
  const svc = createServiceRoleClient();
  const normalized = email.trim().toLowerCase();

  const { data: profile } = await svc
    .from("profiles")
    .select("id, full_name, email")
    .ilike("email", normalized)
    .maybeSingle();
  if (!profile) return;

  const { data: authUser } = await svc.auth.admin.getUserById(profile.id);
  if (!authUser?.user || authUser.user.email_confirmed_at) return;

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await svc
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "resend_confirmation")
    .eq("entity_id", profile.id)
    .gte("created_at", since);
  if ((count ?? 0) > 0) return;

  const { data, error } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email: profile.email,
  });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) {
    console.warn("[resendConfirmation] generateLink failed", error);
    return;
  }

  await sendEmailConfirmation({
    to: profile.email,
    fullName: profile.full_name ?? "",
    confirmUrl: buildConfirmUrl(hashed, "magiclink"),
  });

  await svc.from("audit_logs").insert({
    actor_id: null,
    action: "resend_confirmation",
    entity_type: "profile",
    entity_id: profile.id,
  });
}

/**
 * Called once a user's email is verified. Logs it and — for accounts still
 * awaiting review — notifies the admin so approval can begin. Idempotent:
 * the audit log row guards against duplicate admin emails.
 */
export async function onEmailConfirmed(userId: string) {
  const svc = createServiceRoleClient();

  const { data: profile } = await svc
    .from("profiles")
    .select("id, full_name, email, role, status")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return;

  const { count } = await svc
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "email_confirmed")
    .eq("entity_id", userId);
  if ((count ?? 0) > 0) return;

  await svc.from("audit_logs").insert({
    actor_id: userId,
    action: "email_confirmed",
    entity_type: "profile",
    entity_id: userId,
  });

  if (profile.status !== "pending") return;

  try {
    await sendNewRegistrationToAdmin({
      fullName: profile.full_name ?? profile.email,
      email: profile.email,
      requestedRole: profile.role,
    });
  } catch (e) {
    console.warn("[onEmailConfirmed] admin notification failed", e);
  }

  try {
    const { data: admins } = await svc
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .eq("status", "approved");
    const rows = (admins ?? []).map((a: { id: string }) => ({
      user_id: a.id,
      type: "registration",
      title: `New registration: ${profile.full_name ?? profile.email}`,
      body: "Email verified — awaiting your approval.",
      link: "/admin/approvals",
    }));
    if (rows.length > 0) await svc.from("notifications").insert(rows);
  } catch (e) {
    console.warn("[onEmailConfirmed] in-app notification failed", e);
  }
}
