"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

/**
 * Mark a single notification as read. The `notifications_self` RLS policy
 * (see 0002_rls_policies.sql) allows a user to update their own rows, so we
 * do not need the service-role client here.
 */
export async function markNotificationRead(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing notification id");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/notifications");
  revalidatePath("/admin");
  revalidatePath("/teacher");
  revalidatePath("/student");
}

/**
 * Mark every unread notification for the current user as read in one call.
 */
export async function markAllNotificationsRead() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  if (error) throw error;

  revalidatePath("/notifications");
  revalidatePath("/admin");
  revalidatePath("/teacher");
  revalidatePath("/student");
}
