"use server";

import { revalidatePath } from "next/cache";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { sendAnnouncement } from "@/lib/resend";

type Audience = "all" | "admins" | "teachers" | "students";

async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.status !== "approved") {
    throw new Error("Not authorized");
  }
  return { supabase, profile };
}

/**
 * Publish an announcement. Writes the row, fans out in-app notifications
 * to every approved user in the audience, sends the Resend broadcast, and
 * logs to `audit_logs`.
 */
export async function createAnnouncement(formData: FormData) {
  const { profile: admin } = await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = (String(formData.get("audience") ?? "all") as Audience);

  if (!title || !body) throw new Error("Title and body are required");
  if (!["all", "admins", "teachers", "students"].includes(audience)) {
    throw new Error("Invalid audience");
  }

  const svc = createServiceRoleClient();

  // 1. Insert announcement row.
  const { data: row, error: insertError } = await svc
    .from("announcements")
    .insert({
      title,
      body,
      audience,
      created_by: admin.id,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;

  // 2. Resolve the target audience — approved profiles only.
  let query = svc
    .from("profiles")
    .select("id, email, full_name")
    .eq("status", "approved");

  if (audience === "admins") query = query.eq("role", "admin");
  else if (audience === "teachers") query = query.eq("role", "teacher");
  else if (audience === "students") query = query.eq("role", "student");

  const { data: recipients } = await query;
  const targets = recipients ?? [];

  // 3. Fan out in-app notifications (service role bypasses RLS so we can
  //    write notifications for teachers/students from an admin action).
  if (targets.length > 0) {
    const notificationRows = targets.map((r) => ({
      user_id: r.id,
      type: "announcement",
      title,
      body,
      link: rolePath(audience),
      is_read: false,
    }));
    const { error: notifyError } = await svc
      .from("notifications")
      .insert(notificationRows);
    if (notifyError) {
      console.warn("[createAnnouncement] notification insert failed", notifyError);
    }

    // 4. Send Resend broadcast — best effort.
    try {
      const emails = targets.map((r) => r.email).filter((e): e is string => !!e);
      if (emails.length > 0) {
        await sendAnnouncement({ to: emails, title, body });
      }
    } catch (e) {
      console.warn("[createAnnouncement] email failed", e);
    }
  }

  // 5. Audit log.
  await svc.from("audit_logs").insert({
    actor_id: admin.id,
    action: "create_announcement",
    entity_type: "announcement",
    entity_id: row?.id ?? null,
    metadata: { audience, recipients: targets.length },
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/admin");
  revalidatePath("/teacher");
  revalidatePath("/student");
}

export async function deleteAnnouncement(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id");

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;

  const svc = createServiceRoleClient();
  await svc.from("audit_logs").insert({
    actor_id: admin.id,
    action: "delete_announcement",
    entity_type: "announcement",
    entity_id: id,
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/admin");
}

function rolePath(audience: Audience): string {
  // Landing path the in-app notification link should open to. `all` → the
  // generic /dashboard router will redirect per role.
  switch (audience) {
    case "admins":
      return "/admin";
    case "teachers":
      return "/teacher";
    case "students":
      return "/student";
    default:
      return "/dashboard";
  }
}
