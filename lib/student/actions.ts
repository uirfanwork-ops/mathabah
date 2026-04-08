"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
async function requireStudent() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student" || profile.status !== "approved") {
    throw new Error("Not authorized");
  }

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!student) throw new Error("Student record missing");

  return { supabase, profile, student };
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile
// ─────────────────────────────────────────────────────────────────────────────
export async function updateStudentProfile(formData: FormData) {
  const { supabase, profile, student } = await requireStudent();

  // Full name + phone live on profiles (self_update policy allows this,
  // as long as role doesn't change).
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!fullName) throw new Error("Full name is required");

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", profile.id);
  if (profileErr) throw profileErr;

  // Contact fields live on students (self_update policy allows this).
  const studentFields = [
    "date_of_birth",
    "gender",
    "address",
    "city",
    "country",
    "guardian_name",
    "guardian_phone",
    "guardian_email",
    "emergency_contact",
  ] as const;

  const update: Record<string, string | null> = {};
  for (const f of studentFields) {
    const v = String(formData.get(f) ?? "").trim();
    update[f] = v === "" ? null : v;
  }

  const { error: studentErr } = await supabase
    .from("students")
    .update(update)
    .eq("id", student.id);
  if (studentErr) throw studentErr;

  revalidatePath("/student/profile");
  revalidatePath("/student");
}
