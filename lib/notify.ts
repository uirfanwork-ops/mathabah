import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendAccountNotice } from "@/lib/resend";

/**
 * Best-effort audit entry usable from any role's server action (the
 * audit_logs table is only writable with the service role).
 */
export async function auditLog(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>,
) {
  try {
    const svc = createServiceRoleClient();
    await svc.from("audit_logs").insert({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? null,
    });
  } catch (e) {
    console.warn("[auditLog] failed", action, e);
  }
}

/**
 * Tell a user something happened: in-app notification plus email. Never
 * throws — the primary operation must not fail because a notice did.
 */
export async function notifyProfile(
  profileId: string,
  n: { type: string; title: string; message: string; link: string },
) {
  try {
    const svc = createServiceRoleClient();
    const { data: profile } = await svc
      .from("profiles")
      .select("email, full_name")
      .eq("id", profileId)
      .maybeSingle();

    await svc.from("notifications").insert({
      user_id: profileId,
      type: n.type,
      title: n.title,
      body: n.message,
      link: n.link,
    });

    if (profile?.email) {
      await sendAccountNotice({
        to: profile.email,
        fullName: profile.full_name ?? "",
        subject: n.title,
        message: n.message,
        linkPath: n.link,
      });
    }
  } catch (e) {
    console.warn("[notifyProfile] failed", n.type, e);
  }
}
