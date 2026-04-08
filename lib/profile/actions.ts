"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// Shared profile actions — usable from any portal (admin / teacher / student).
// All contact fields (phone, address, city, country) live on public.profiles
// and are updatable by the user themselves under the profiles_self_update
// RLS policy, which also blocks them from changing their own role.
// ─────────────────────────────────────────────────────────────────────────────

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

interface UpdateContactResult {
  ok: true;
}

/**
 * Update the logged-in user's own contact details. Name + phone + address
 * are all self-serve. Email is intentionally read-only here — changing it
 * in Supabase Auth triggers a confirmation flow that we don't want to
 * tangle the settings page with.
 */
export async function updateOwnContact(
  formData: FormData,
): Promise<UpdateContactResult> {
  const { supabase, user } = await requireUser();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();

  if (!fullName) throw new Error("Full name is required.");
  if (!phone) throw new Error("Phone number is required.");
  if (!address) throw new Error("Address is required.");

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone,
      address,
      city: city || null,
      country: country || null,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
  revalidatePath("/teacher/settings");
  revalidatePath("/student/settings");
  revalidatePath("/auth/complete-profile");
  return { ok: true };
}

/**
 * Change the logged-in user's password. Supabase requires the user to be
 * freshly authenticated, which they are (this runs under their session
 * cookie). We don't ask for the current password because Supabase's
 * updateUser doesn't either — the session itself is the authorization.
 */
export async function updateOwnPassword(formData: FormData) {
  const { supabase } = await requireUser();

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (password !== confirm) {
    throw new Error("Passwords do not match.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);

  return { ok: true as const };
}
