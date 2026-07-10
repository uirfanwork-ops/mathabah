"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import {
  sendApprovalRejection,
  sendApprovalWelcome,
  sendEnrollmentNotification,
  sendGradesUpdated,
  sendNewAssessment,
  sendNewResource,
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
  revalidatePath("/admin/students");
  revalidatePath("/admin/teachers");
  revalidatePath("/admin/admins");
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

export async function deleteTeacher(formData: FormData) {
  const { profile: admin } = await requireAdmin();
  const teacherId = String(formData.get("teacher_id") ?? "");
  if (!teacherId) throw new Error("Missing teacher id");

  const svc = createServiceRoleClient();

  // Look up profile_id then cascade-delete the profile as well
  const { data: teacher } = await svc
    .from("teachers")
    .select("profile_id")
    .eq("id", teacherId)
    .single();

  await svc.from("teachers").delete().eq("id", teacherId);
  if (teacher?.profile_id) {
    await svc.from("profiles").delete().eq("id", teacher.profile_id);
    // Note: auth.users is left in place — admin can purge from Supabase dashboard.
  }

  await logAudit(admin.id, "delete_teacher", "teacher", teacherId);
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

export async function updateProgram(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) throw new Error("Missing program id");
  if (!name) throw new Error("Name is required");

  const { error } = await supabase
    .from("programs")
    .update({
      name,
      code: String(formData.get("code") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      duration_months:
        Number(formData.get("duration_months")) > 0
          ? Number(formData.get("duration_months"))
          : null,
    })
    .eq("id", id);
  if (error) throw error;

  await logAudit(admin.id, "update_program", "program", id);
  revalidatePath("/admin/programs");
  revalidatePath(`/admin/programs/${id}`);
  redirect("/admin/programs");
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

export async function updateCourse(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) throw new Error("Missing course id");
  if (!name) throw new Error("Name is required");

  const programId = String(formData.get("program_id") ?? "") || null;
  const teacherId = String(formData.get("teacher_id") ?? "") || null;

  const { error } = await supabase
    .from("courses")
    .update({
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
      is_active: formData.get("is_active") === "on",
      program_id: programId,
      teacher_id: teacherId,
    })
    .eq("id", id);
  if (error) throw error;

  await logAudit(admin.id, "update_course", "course", id);
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${id}`);
  redirect(`/admin/courses/${id}`);
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
// Assessments + grades (admin)
// ─────────────────────────────────────────────────────────────────────────────
export async function adminCreateAssessment(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const courseId = String(formData.get("course_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "") || null;
  if (!courseId || !name) throw new Error("Missing fields");

  const { error } = await supabase.from("assessments").insert({
    course_id: courseId,
    name,
    category: String(formData.get("category") ?? "assignment").trim() || "assignment",
    description: String(formData.get("description") ?? "").trim() || null,
    max_score: Number(formData.get("max_score") ?? 100),
    weight: Number(formData.get("weight") ?? 1),
    due_date: dueDate,
  });
  if (error) throw error;

  await logAudit(admin.id, "create_assessment", "assessment", null, {
    course_id: courseId,
    name,
  });

  try {
    const svc = createServiceRoleClient();
    const [{ data: course }, { data: enrollments }] = await Promise.all([
      svc.from("courses").select("name").eq("id", courseId).single(),
      svc
        .from("enrollments")
        .select("students(profiles(email))")
        .eq("course_id", courseId)
        .eq("status", "active"),
    ]);
    const studentProfiles: { email: string; profile_id: string }[] = [];
    for (const e of enrollments ?? []) {
      const s = Array.isArray((e as any).students) ? (e as any).students[0] : (e as any).students;
      const p = Array.isArray(s?.profiles) ? s?.profiles[0] : s?.profiles;
      if (p?.email) studentProfiles.push({ email: p.email, profile_id: s?.profile_id ?? p?.id });
    }
    const emails = studentProfiles.map((sp) => sp.email);
    if (emails.length > 0 && course) {
      await sendNewAssessment({
        to: emails,
        courseName: course.name,
        assessmentName: name,
        dueDate,
      });
    }
    if (course) {
      const { data: enrolledStudents } = await svc
        .from("enrollments")
        .select("students(profile_id)")
        .eq("course_id", courseId)
        .eq("status", "active");
      const notifs = (enrolledStudents ?? [])
        .map((e: any) => {
          const s = Array.isArray(e.students) ? e.students[0] : e.students;
          return s?.profile_id;
        })
        .filter(Boolean)
        .map((uid: string) => ({
          user_id: uid,
          type: "assessment",
          title: `New assessment: ${name}`,
          body: `A new assessment "${name}" has been posted for ${course.name}.`,
          link: "/student/my-courses",
        }));
      if (notifs.length > 0) {
        await svc.from("notifications").insert(notifs);
      }
    }
  } catch (e) {
    console.warn("[adminCreateAssessment] email/notification failed", e);
  }

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function adminRecordGrades(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const assessmentId = String(formData.get("assessment_id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  if (!assessmentId || !courseId) throw new Error("Missing fields");

  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId);
  if (enrollErr) throw enrollErr;

  const rows: {
    enrollment_id: string;
    assessment_id: string;
    score: number | null;
    feedback: string | null;
    recorded_by: string;
  }[] = [];

  for (const e of enrollments ?? []) {
    const raw = formData.get(`score_${e.id}`);
    const feedback =
      String(formData.get(`feedback_${e.id}`) ?? "").trim() || null;
    if (raw === null || raw === "") continue;
    const score = Number(raw);
    if (Number.isNaN(score)) continue;
    rows.push({
      enrollment_id: e.id,
      assessment_id: assessmentId,
      score,
      feedback,
      recorded_by: admin.id,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("grades")
      .upsert(rows, { onConflict: "enrollment_id,assessment_id" });
    if (error) throw error;
  }

  await logAudit(admin.id, "record_grades", "grade", null, {
    course_id: courseId,
    assessment_id: assessmentId,
    count: rows.length,
  });

  if (rows.length > 0) {
    try {
      const svc = createServiceRoleClient();
      const gradedEnrollmentIds = rows.map((r) => r.enrollment_id);
      const [{ data: assessment }, { data: course }, { data: enrollments }] =
        await Promise.all([
          svc.from("assessments").select("name").eq("id", assessmentId).single(),
          svc.from("courses").select("name").eq("id", courseId).single(),
          svc
            .from("enrollments")
            .select("id, students(profile_id, profiles(email, full_name))")
            .in("id", gradedEnrollmentIds),
        ]);
      const notifs: { user_id: string; type: string; title: string; body: string; link: string }[] = [];
      for (const e of enrollments ?? []) {
        const s = Array.isArray((e as any).students) ? (e as any).students[0] : (e as any).students;
        const p = Array.isArray(s?.profiles) ? s?.profiles[0] : s?.profiles;
        if (p?.email && assessment && course) {
          sendGradesUpdated({
            to: p.email,
            fullName: p.full_name,
            courseName: course.name,
            assessmentName: assessment.name,
          }).catch(() => {});
        }
        if (s?.profile_id && assessment && course) {
          notifs.push({
            user_id: s.profile_id,
            type: "grade",
            title: `Grade posted: ${assessment.name}`,
            body: `Your grade for "${assessment.name}" in ${course.name} has been posted.`,
            link: "/student/grades",
          });
        }
      }
      if (notifs.length > 0) {
        await svc.from("notifications").insert(notifs);
      }
    } catch (e) {
      console.warn("[adminRecordGrades] email/notification failed", e);
    }
  }

  revalidatePath(`/admin/courses/${courseId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Course resources (admin)
// ─────────────────────────────────────────────────────────────────────────────
export async function adminAddCourseResource(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const courseId = String(formData.get("course_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description =
    String(formData.get("description") ?? "").trim() || null;
  const fileUrl = String(formData.get("file_url") ?? "").trim() || null;
  const linkUrl = String(formData.get("link_url") ?? "").trim() || null;

  if (!courseId || !name) throw new Error("Course id and name are required");
  if (!fileUrl && !linkUrl) {
    throw new Error("Provide at least a file URL or a link URL");
  }

  const { error } = await supabase.from("course_resources").insert({
    course_id: courseId,
    name,
    description,
    file_url: fileUrl,
    link_url: linkUrl,
    uploaded_by: admin.id,
  });
  if (error) throw error;

  await logAudit(admin.id, "add_course_resource", "course_resource", null, {
    course_id: courseId,
  });

  try {
    const svc = createServiceRoleClient();
    const [{ data: course }, { data: enrollments }] = await Promise.all([
      svc.from("courses").select("name").eq("id", courseId).single(),
      svc
        .from("enrollments")
        .select("students(profiles(email))")
        .eq("course_id", courseId)
        .eq("status", "active"),
    ]);
    const emails = (enrollments ?? [])
      .map((e: any) => {
        const s = Array.isArray(e.students) ? e.students[0] : e.students;
        const p = Array.isArray(s?.profiles) ? s?.profiles[0] : s?.profiles;
        return p?.email;
      })
      .filter(Boolean) as string[];
    if (emails.length > 0 && course) {
      await sendNewResource({ to: emails, courseName: course.name, resourceName: name });
    }
    if (course) {
      const { data: enrolledStudents } = await svc
        .from("enrollments")
        .select("students(profile_id)")
        .eq("course_id", courseId)
        .eq("status", "active");
      const notifs = (enrolledStudents ?? [])
        .map((e: any) => {
          const s = Array.isArray(e.students) ? e.students[0] : e.students;
          return s?.profile_id;
        })
        .filter(Boolean)
        .map((uid: string) => ({
          user_id: uid,
          type: "resource",
          title: `New resource: ${name}`,
          body: `A new resource "${name}" has been shared for ${course.name}.`,
          link: "/student/my-courses",
        }));
      if (notifs.length > 0) {
        await svc.from("notifications").insert(notifs);
      }
    }
  } catch (e) {
    console.warn("[adminAddCourseResource] email/notification failed", e);
  }

  revalidatePath(`/admin/courses/${courseId}`);
}

export async function adminDeleteCourseResource(formData: FormData) {
  const { profile: admin, supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  if (!id || !courseId) throw new Error("Missing fields");

  const { error } = await supabase
    .from("course_resources")
    .delete()
    .eq("id", id);
  if (error) throw error;

  await logAudit(admin.id, "delete_course_resource", "course_resource", id);
  revalidatePath(`/admin/courses/${courseId}`);
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

  try {
    const svc = createServiceRoleClient();
    const [{ data: student }, { data: course }] = await Promise.all([
      svc.from("students").select("profiles(email, full_name)").eq("id", student_id).single(),
      svc.from("courses").select("name, code").eq("id", course_id).single(),
    ]);
    const profile = Array.isArray(student?.profiles) ? student?.profiles[0] : student?.profiles;
    if (profile?.email && course) {
      await sendEnrollmentNotification({
        to: profile.email,
        fullName: profile.full_name,
        courseName: course.name,
        courseCode: course.code,
      });
    }
    const { data: studentRow } = await svc
      .from("students")
      .select("profile_id")
      .eq("id", student_id)
      .single();
    if (studentRow?.profile_id && course) {
      await svc.from("notifications").insert({
        user_id: studentRow.profile_id,
        type: "enrollment",
        title: `Enrolled in ${course.name}`,
        body: `You have been enrolled in ${course.code ? `${course.code} — ` : ""}${course.name}.`,
        link: "/student/my-courses",
      });
    }
  } catch (e) {
    console.warn("[createEnrollment] email/notification failed", e);
  }

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
