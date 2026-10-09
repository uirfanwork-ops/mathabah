import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendPasswordReset } from "@/lib/resend";
import { resendConfirmationFor } from "@/lib/auth/email-confirmation";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Email a password-reset link to any registered user (student, teacher or
 * admin). Never reveals whether the address exists; throttled to one email per
 * minute per account. Unconfirmed accounts get a confirmation email instead,
 * since a reset link must not bypass email verification.
 */
export async function requestPasswordReset(email: string) {
  const svc = createServiceRoleClient();
  const normalized = email.trim().toLowerCase();

  const { data: profile } = await svc
    .from("profiles")
    .select("id, full_name, email")
    .ilike("email", normalized)
    .maybeSingle();
  if (!profile) return;

  const { data: authUser } = await svc.auth.admin.getUserById(profile.id);
  if (!authUser?.user) return;
  if (!authUser.user.email_confirmed_at) {
    await resendConfirmationFor(profile.email);
    return;
  }

  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await svc
    .from("audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "password_reset_requested")
    .eq("entity_id", profile.id)
    .gte("created_at", since);
  if ((count ?? 0) > 0) return;

  const { data, error } = await svc.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
  });
  const hashed = data?.properties?.hashed_token;
  if (error || !hashed) {
    console.warn("[requestPasswordReset] generateLink failed", error);
    return;
  }

  const url = new URL("/auth/confirm", appUrl);
  url.searchParams.set("token_hash", hashed);
  url.searchParams.set("type", "recovery");

  await sendPasswordReset({
    to: profile.email,
    fullName: profile.full_name ?? "",
    resetUrl: url.toString(),
  });

  await svc.from("audit_logs").insert({
    actor_id: null,
    action: "password_reset_requested",
    entity_type: "profile",
    entity_id: profile.id,
  });
}
