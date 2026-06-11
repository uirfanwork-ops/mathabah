"use server";

import { revalidatePath } from "next/cache";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

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

  // Full name, phone, and address fields live on profiles (see migration
  // 0003 — address/city/country were lifted off public.students onto
  // public.profiles so every role has one place to store contact info).
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const address = String(formData.get("address") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const country = String(formData.get("country") ?? "").trim() || null;

  if (!fullName) throw new Error("Full name is required");

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone, address, city, country })
    .eq("id", profile.id);
  if (profileErr) throw profileErr;

  // Student-specific fields (DOB, gender, guardian, emergency) stay on the
  // students table.
  const studentFields = [
    "date_of_birth",
    "gender",
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

// ─────────────────────────────────────────────────────────────────────────────
// Self-enrollment
// ─────────────────────────────────────────────────────────────────────────────
export async function requestEnrollment(formData: FormData) {
  const { student } = await requireStudent();

  const course_id = String(formData.get("course_id") ?? "").trim();
  if (!course_id) throw new Error("Missing course");

  const svc = createServiceRoleClient();

  const { data: course } = await svc
    .from("courses")
    .select("is_active")
    .eq("id", course_id)
    .single();
  if (!course?.is_active) throw new Error("This course is not open for enrollment");

  const { error } = await svc
    .from("enrollments")
    .insert({ student_id: student.id, course_id });

  if (error && !`${error.message}`.includes("duplicate")) throw error;

  revalidatePath("/student/grades");
  revalidatePath("/student/my-courses");
}
