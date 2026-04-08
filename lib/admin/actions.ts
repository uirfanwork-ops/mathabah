"use server";

import { revalidatePath } from "next/cache";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  sendApprovalRejection,
  sendApprovalWelcome,
  sendPaymentConfirmation,
} from "@/lib/resend";

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.status !== "approved") {
    throw new Error("Not authorized");
  }
  return { supabase, profile };
}

async function logAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>,
) {
  const svc = createServiceRoleClient();
  await svc.from("audit_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata: metadata ?? null,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Account approvals
// ─────────────────────────────────────────────────────────────────────────────
export async function approveAccount(formData: FormData) {
  const { profile: admin } = await requireAdmin();
  const targetId = String(formData.get("profile_id") ?? "");
  const role = String(formData.get("role") ?? "student") as
    | "admin"
    | "teacher"
    | "student";
  if (!targetId) throw new Error("Missing profile id");

  const svc = createServiceRoleClient();

  const { data: target, error: fetchError } = await svc
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", targetId)
    .single();
  if (fetchError || !target) throw new Error("Profile not found");

  // Update profile: approve + assign role
  const { error: updateError } = await svc
    .from("profiles")
    .update({
      status: "approved",
      role,
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", targetId);
  if (updateError) throw updateError;

  // Create the role-specific row if it doesn't already exist. We throw on
  // error here rather than letting it fail silently — a missing students /
  // teachers row leaves the user invisible on /admin/students (because the
  // list pages join through those tables) and breaks every downstream
  // operation that expects to resolve a student_id / teacher_id.
  if (role === "student") {
    const { error: roleRowError } = await svc
      .from("students")
      .upsert({ profile_id: targetId }, { onConflict: "profile_id" });
    if (roleRowError) throw roleRowError;
  } else if (role === "teacher") {
    const { error: roleRowError } = await svc
      .from("teachers")
      .upsert({ profile_id: targetId }, { onConflict: "profile_id" });
    if (roleRowError) throw roleRowError;
  }

  await logAudit(admin.id, "approve_account", "profile", targetId, { role });

  // Send welcome email — best effort
  try {
    await sendApprovalWelcome({
      to: target.email,
      fullName: target.full_name,
      role,
    });
  } catch (e) {
    console.warn("[approveAccount] welcome email failed", e);
  }

  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
}

export async function rejectAccount(formData: FormData) {
  const { profile: admin } = await requireAdmin();
  const targetId = String(formData.get("profile_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || undefined;
  if (!targetId) throw new Error("Missing profile id");

  const svc = createServiceRoleClient();

  const { data: target } = await svc
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", targetId)
    .single();
  if (!target) throw new Error("Profile not found");

  const { error } = await svc
    .from("profiles")
    .update({
      status: "rejected",
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", targetId);
  if (error) throw error;

  await logAudit(admin.id, "reject_account", "profile", targetId, { reason });

  try {
    await sendApprovalRejection({
      to: target.email,
      fullName: target.full_name,
      reason,
    });
  } catch (e) {
    console.warn("[rejectAccount] rejection email failed", e);
  }

  revalidatePath("/admin/approvals");
  revalidatePath("/admin");
}

// ─────────────────────────────────────────────────────────────────────────────
// Create users (admin provisions student / teacher / admin accounts directly,
// bypassing the public register + approve flow)
// ─────────────────────────────────────────────────────────────────────────────
export async function createUser(formData: FormData) {
  const { profile: admin } = await requireAdmin();

  const role = String(formData.get("role") ?? "") as
    | "student"
    | "teacher"
    | "admin";
  if (!["student", "teacher", "admin"].includes(role)) {
    throw new Error("Invalid role");
  }

  // Common fields
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();

  if (!email) throw new Error("Email is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email is not valid.");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  if (!fullName) throw new Error("Full name is required.");
  if (!phone) throw new Error("Phone number is required.");
  if (!address) throw new Error("Address is required.");

  const svc = createServiceRoleClient();

  // 1. Create the auth user with the password pre-set and the email already
  //    confirmed so they can log in immediately with no confirmation step.
  const { data: created, error: createErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr) throw new Error(createErr.message);
  const newUserId = created.user?.id;
  if (!newUserId) throw new Error("Failed to create user.");

  // 2. The handle_new_user trigger (see 0001_initial_schema.sql) auto-inserts
  //    a profiles row with role='student' / status='pending'. Update it to
  //    the real role / contact info the admin just entered.
  const { error: updErr } = await svc
    .from("profiles")
    .update({
      role,
      status: "approved",
      full_name: fullName,
      phone,
      address,
      city: city || null,
      country: country || null,
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", newUserId);

  if (updErr) {
    // Roll back the auth user so we don't leave an orphan that can log in.
    await svc.auth.admin.deleteUser(newUserId);
    throw new Error(updErr.message);
  }

  // 3. Create the role-specific row so downstream list pages and joins work.
  if (role === "student") {
    const studentFields = [
      "student_number",
      "date_of_birth",
      "gender",
      "guardian_name",
      "guardian_phone",
      "guardian_email",
      "emergency_contact",
      "notes",
    ] as const;
    const studentInsert: Record<string, string | null> = {
      profile_id: newUserId,
    };
    for (const f of studentFields) {
      const v = String(formData.get(f) ?? "").trim();
      if (v !== "") studentInsert[f] = v;
    }
    const { error: sErr } = await svc.from("students").insert(studentInsert);
    if (sErr) {
      await svc.auth.admin.deleteUser(newUserId);
      throw new Error(sErr.message);
    }
  } else if (role === "teacher") {
    const teacherFields = [
      "employee_number",
      "bio",
      "specialization",
      "qualifications",
      "hire_date",
    ] as const;
    const teacherInsert: Record<string, string | null> = {
      profile_id: newUserId,
    };
    for (const f of teacherFields) {
      const v = String(formData.get(f) ?? "").trim();
      if (v !== "") teacherInsert[f] = v;
    }
    const { error: tErr } = await svc.from("teachers").insert(teacherInsert);
    if (tErr) {
      await svc.auth.admin.deleteUser(newUserId);
      throw new Error(tErr.message);
    }
  }

  await logAudit(admin.id, "create_user", "profile", newUserId, {
    role,
    email,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/students");
  revalidatePath("/admin/teachers");
  revalidatePath("/admin/admins");
  revalidatePath("/admin/approvals");
}

// ─────────────────────────────────────────────────────────────────────────────
// Students
// ─────────────────────────────────────────────────────────────────────────────
export async function updateStudent(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const studentId = String(formData.get("student_id") ?? "");
  if (!studentId) throw new Error("Missing student id");

  // Student-specific columns that still live on public.students
  const studentFields = [
    "student_number",
    "date_of_birth",
    "gender",
    "guardian_name",
    "guardian_phone",
    "guardian_email",
    "emergency_contact",
    "notes",
  ] as const;

  const studentUpdate: Record<string, string | null> = {};
  for (const f of studentFields) {
    const v = String(formData.get(f) ?? "").trim();
    studentUpdate[f] = v === "" ? null : v;
  }

  const { error } = await supabase
    .from("students")
    .update(studentUpdate)
    .eq("id", studentId);
  if (error) throw error;

  // Contact fields (phone, address, city, country) live on profiles —
  // resolve the profile id from the students row and update it.
  const profileFields = ["phone", "address", "city", "country"] as const;
  const profileUpdate: Record<string, string | null> = {};
  let hasProfileUpdate = false;
  for (const f of profileFields) {
    if (formData.has(f)) {
      const v = String(formData.get(f) ?? "").trim();
      profileUpdate[f] = v === "" ? null : v;
      hasProfileUpdate = true;
    }
  }

  if (hasProfileUpdate) {
    const { data: studentRow } = await supabase
      .from("students")
      .select("profile_id")
      .eq("id", studentId)
      .single();

    if (studentRow?.profile_id) {
      const { error: profileErr } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", studentRow.profile_id);
      if (profileErr) throw profileErr;
    }
  }

  await logAudit(admin.id, "update_student", "student", studentId);
  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath("/admin/students");
}

export async function deleteStudent(formData: FormData) {
  const { profile: admin } = await requireAdmin();
  const studentId = String(formData.get("student_id") ?? "");
  if (!studentId) throw new Error("Missing student id");

  const svc = createServiceRoleClient();

  // Look up profile_id then cascade-delete the auth user as well
  const { data: student } = await svc
    .from("students")
    .select("profile_id")
    .eq("id", studentId)
    .single();

  await svc.from("students").delete().eq("id", studentId);
  if (student?.profile_id) {
    await svc.from("profiles").delete().eq("id", student.profile_id);
    // Note: auth.users is left in place — admin can purge from Supabase dashboard.
  }

  await logAudit(admin.id, "delete_student", "student", studentId);
  revalidatePath("/admin/students");
}

// ─────────────────────────────────────────────────────────────────────────────
// Teachers
// ─────────────────────────────────────────────────────────────────────────────
export async function updateTeacher(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const teacherId = String(formData.get("teacher_id") ?? "");
  if (!teacherId) throw new Error("Missing teacher id");

  const fields = [
    "employee_number",
    "bio",
    "specialization",
    "qualifications",
    "hire_date",
  ] as const;

  const update: Record<string, string | null> = {};
  for (const f of fields) {
    const v = String(formData.get(f) ?? "").trim();
    update[f] = v === "" ? null : v;
  }

  const { error } = await supabase
    .from("teachers")
    .update(update)
    .eq("id", teacherId);
  if (error) throw error;

  await logAudit(admin.id, "update_teacher", "teacher", teacherId);
  revalidatePath(`/admin/teachers/${teacherId}`);
  revalidatePath("/admin/teachers");
}

// ─────────────────────────────────────────────────────────────────────────────
// Programs
// ─────────────────────────────────────────────────────────────────────────────
export async function createProgram(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const { data, error } = await supabase
    .from("programs")
    .insert({
      name,
      code: String(formData.get("code") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      duration_months:
        Number(formData.get("duration_months")) > 0
          ? Number(formData.get("duration_months"))
          : null,
    })
    .select("id")
    .single();
  if (error) throw error;

  await logAudit(admin.id, "create_program", "program", data?.id ?? null);
  revalidatePath("/admin/programs");
}

export async function deleteProgram(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing program id");
  const { error } = await supabase.from("programs").delete().eq("id", id);
  if (error) throw error;
  await logAudit(admin.id, "delete_program", "program", id);
  revalidatePath("/admin/programs");
}

// ─────────────────────────────────────────────────────────────────────────────
// Courses
// ─────────────────────────────────────────────────────────────────────────────
export async function createCourse(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name is required");

  const programId = String(formData.get("program_id") ?? "") || null;
  const teacherId = String(formData.get("teacher_id") ?? "") || null;

  const { data, error } = await supabase
    .from("courses")
    .insert({
      name,
      code: String(formData.get("code") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      schedule: String(formData.get("schedule") ?? "").trim() || null,
      capacity:
        Number(formData.get("capacity")) > 0
          ? Number(formData.get("capacity"))
          : null,
      start_date: String(formData.get("start_date") ?? "") || null,
      end_date: String(formData.get("end_date") ?? "") || null,
      program_id: programId,
      teacher_id: teacherId,
    })
    .select("id")
    .single();
  if (error) throw error;

  await logAudit(admin.id, "create_course", "course", data?.id ?? null);
  revalidatePath("/admin/courses");
}

export async function deleteCourse(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing course id");
  const { error } = await supabase.from("courses").delete().eq("id", id);
  if (error) throw error;
  await logAudit(admin.id, "delete_course", "course", id);
  revalidatePath("/admin/courses");
}

// ─────────────────────────────────────────────────────────────────────────────
// Enrollments
// ─────────────────────────────────────────────────────────────────────────────
export async function createEnrollment(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const student_id = String(formData.get("student_id") ?? "");
  const course_id = String(formData.get("course_id") ?? "");
  if (!student_id || !course_id) throw new Error("Missing fields");

  const { error } = await supabase
    .from("enrollments")
    .insert({ student_id, course_id });
  if (error && !`${error.message}`.includes("duplicate")) throw error;

  await logAudit(admin.id, "create_enrollment", "enrollment", null, {
    student_id,
    course_id,
  });
  revalidatePath(`/admin/students/${student_id}`);
  revalidatePath(`/admin/courses/${course_id}`);
}

export async function deleteEnrollment(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const student_id = String(formData.get("student_id") ?? "");
  if (!id) throw new Error("Missing enrollment id");
  const { error } = await supabase.from("enrollments").delete().eq("id", id);
  if (error) throw error;
  await logAudit(admin.id, "delete_enrollment", "enrollment", id);
  if (student_id) revalidatePath(`/admin/students/${student_id}`);
  revalidatePath("/admin/courses");
}

// ─────────────────────────────────────────────────────────────────────────────
// Payments
// ─────────────────────────────────────────────────────────────────────────────
export async function recordPayment(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const student_id = String(formData.get("student_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (!student_id || amount <= 0) throw new Error("Invalid payment");

  const insert = {
    student_id,
    amount,
    currency: String(formData.get("currency") ?? "USD"),
    payment_date:
      String(formData.get("payment_date") ?? "") ||
      new Date().toISOString().slice(0, 10),
    method:
      (String(formData.get("method") ?? "bank_transfer") as
        | "cash"
        | "bank_transfer"
        | "card"
        | "cheque"
        | "other"),
    reference: String(formData.get("reference") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    recorded_by: admin.id,
  };

  const { data: row, error } = await supabase
    .from("payments")
    .insert(insert)
    .select("id, amount, currency, payment_date, reference")
    .single();
  if (error) throw error;

  await logAudit(admin.id, "record_payment", "payment", row?.id ?? null, {
    student_id,
    amount,
  });

  // Send confirmation to student — best effort
  try {
    const svc = createServiceRoleClient();
    const { data: studentRow } = await svc
      .from("students")
      .select("profile_id, profiles!inner(full_name, email)")
      .eq("id", student_id)
      .single();
    const profile = (studentRow as any)?.profiles;
    if (profile?.email) {
      await sendPaymentConfirmation({
        to: profile.email,
        fullName: profile.full_name,
        amount: `${insert.currency} ${amount.toFixed(2)}`,
        reference: insert.reference ?? undefined,
        date: insert.payment_date,
      });
    }
  } catch (e) {
    console.warn("[recordPayment] confirmation email failed", e);
  }

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/students/${student_id}`);
}
