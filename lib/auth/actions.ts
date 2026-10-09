"use server";

import { auditLog } from "@/lib/notify";
import { sendAccountNotice } from "@/lib/resend";
import { createClient } from "@/lib/supabase/server";

/**
 * Sets a new password for the signed-in user (reached via the emailed
 * recovery link). Logs the change and emails the user so an unexpected
 * change is noticed.
 */
export async function setNewPassword(password: string) {
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "This reset link has expired. Please request a new one." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  await auditLog(user.id, "password_changed", "profile", user.id);

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.email) {
      await sendAccountNotice({
        to: profile.email,
        fullName: profile.full_name ?? "",
        subject: "Your password was changed",
        message:
          "The password for your Mathabah Institute account was just changed.",
      });
    }
  } catch (e) {
    console.warn("[setNewPassword] notice failed", e);
  }

  return { ok: true };
}
