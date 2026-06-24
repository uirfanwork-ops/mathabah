"use server";

import { revalidatePath } from "next/cache";

import {
  createClient,
  createServiceRoleClient,
} from "@/lib/supabase/server";
import {
  sendGradesUpdated,
  sendNewAssessment,
  sendNewResource,
  sendTeacherReportToAdmin,
} from "@/lib/resend";

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
async function requireTeacher() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "teacher" || profile.status !== "approved") {
    throw new Error("Not authorized");
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!teacher) throw new Error("Teacher record missing");

  return { supabase, profile, teacher };
}

async function assertTeacherOwnsCourse(courseId: string, teacherId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, teacher_id")
    .eq("id", courseId)
    .single();
  if (error || !data || data.teacher_id !== teacherId) {
    throw new Error("Course not assigned to you");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance
// ─────────────────────────────────────────────────────────────────────────────
type AttStatus = "present" | "absent" | "late" | "excused";

export async function recordAttendance(formData: FormData) {
  const { supabase, teacher, profile } = await requireTeacher();
  const courseId = String(formData.get("course_id") ?? "");
  const sessionDate = String(formData.get("session_date") ?? "");
  if (!courseId || !sessionDate) throw new Error("Missing course or date");

  await assertTeacherOwnsCourse(courseId, teacher.id);

  // Pull all enrolled students for the course
  const { data: enrollments, error: enrollErr } = await supabase
    .from("enrollments")
    .select("id")
    .eq("course_id", courseId);
  if (enrollErr) throw enrollErr;

  const rows: {
    enrollment_id: string;
    session_date: string;
    status: AttStatus;
    notes: string | null;
    recorded_by: string;
  }[] = [];

  for (const e of enrollments ?? []) {
    const status = String(
      formData.get(`status_${e.id}`) ?? "present",
    ) as AttStatus;
    const notes =
      String(formData.get(`notes_${e.id}`) ?? "").trim() || null;
    rows.push({
      enrollment_id: e.id,
      session_date: sessionDate,
      status,
      notes,
      recorded_by: profile.id,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "enrollment_id,session_date" });
    if (error) throw error;
  }

  revalidatePath(`/teacher/my-courses/${courseId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Assessments + grades
// ─────────────────────────────────────────────────────────────────────────────
export async function createAssessment(formData: FormData) {
  const { supabase, teacher } = await requireTeacher();
  const courseId = String(formData.get("course_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const dueDate = String(formData.get("due_date") ?? "") || null;
  if (!courseId || !name) throw new Error("Missing fields");

  await assertTeacherOwnsCourse(courseId, teacher.id);

  const { error } = await supabase.from("assessments").insert({
    course_id: courseId,
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    max_score: Number(formData.get("max_score") ?? 100),
    weight: Number(formData.get("weight") ?? 1),
    due_date: dueDate,
  });
  if (error) throw error;

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
      await sendNewAssessment({ to: emails, courseName: course.name, assessmentName: name, dueDate });
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
    console.warn("[createAssessment] email/notification failed", e);
  }

  revalidatePath(`/teacher/my-courses/${courseId}`);
}

export async function recordGrades(formData: FormData) {
  const { supabase, teacher, profile } = await requireTeacher();
  const assessmentId = String(formData.get("assessment_id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  if (!assessmentId || !courseId) throw new Error("Missing fields");

  await assertTeacherOwnsCourse(courseId, teacher.id);

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
      recorded_by: profile.id,
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase
      .from("grades")
      .upsert(rows, { onConflict: "enrollment_id,assessment_id" });
    if (error) throw error;

    try {
      const svc = createServiceRoleClient();
      const gradedIds = rows.map((r) => r.enrollment_id);
      const [{ data: assessment }, { data: course }, { data: enrollments }] =
        await Promise.all([
          svc.from("assessments").select("name").eq("id", assessmentId).single(),
          svc.from("courses").select("name").eq("id", courseId).single(),
          svc.from("enrollments").select("id, students(profile_id, profiles(email, full_name))").in("id", gradedIds),
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
      console.warn("[recordGrades] email/notification failed", e);
    }
  }

  revalidatePath(`/teacher/my-courses/${courseId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Teacher reports (mid-course / end-of-course / concern)
// ─────────────────────────────────────────────────────────────────────────────
export async function submitTeacherReport(formData: FormData) {
  const { supabase, teacher, profile } = await requireTeacher();

  const studentId = String(formData.get("student_id") ?? "");
  const courseId = String(formData.get("course_id") ?? "") || null;
  const type = String(formData.get("type") ?? "mid_course") as
    | "mid_course"
    | "end_of_course"
    | "concern";
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const visible = formData.get("is_visible_to_student") === "on";

  if (!studentId || !title || !content) {
    throw new Error("Title, content and student are required");
  }

  if (courseId) {
    await assertTeacherOwnsCourse(courseId, teacher.id);
  }

  // Verify the teacher actually has this student enrolled in one of their courses
  const { data: rel } = await supabase
    .from("enrollments")
    .select("id, courses!inner(teacher_id)")
    .eq("student_id", studentId)
    .limit(1)
    .maybeSingle();
  // RLS will already prevent reading enrollments outside teacher's courses,
  // so a null result means "not your student".
  if (!rel) {
    throw new Error("That student is not enrolled in any of your courses");
  }

  const { data: report, error } = await supabase
    .from("teacher_reports")
    .insert({
      teacher_id: teacher.id,
      student_id: studentId,
      course_id: courseId,
      type,
      title,
      content,
      is_visible_to_student: visible,
    })
    .select("id")
    .single();
  if (error) throw error;

  // Look up student name for the email
  const { data: studentRow } = await supabase
    .from("students")
    .select("profiles(full_name)")
    .eq("id", studentId)
    .single();
  const studentProfile = Array.isArray((studentRow as any)?.profiles)
    ? (studentRow as any)?.profiles[0]
    : (studentRow as any)?.profiles;
  const studentName = studentProfile?.full_name ?? "Unknown student";

  // Notify admin via Resend (best effort)
  try {
    await sendTeacherReportToAdmin({
      teacherName: profile.full_name,
      studentName,
      reportType: type.replace("_", " "),
      reportId: report?.id ?? "",
    });
  } catch (e) {
    console.warn("[submitTeacherReport] email failed", e);
  }

  // For "concern" reports, also create in-app notifications for every admin.
  // Use the service role client because RLS prevents teachers from inserting
  // notifications for other users.
  if (type === "concern") {
    try {
      const svc = createServiceRoleClient();
      const { data: admins } = await svc
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("status", "approved");
      const notifs = (admins ?? []).map((a: { id: string }) => ({
        user_id: a.id,
        type: "concern",
        title: `Student concern: ${studentName}`,
        body: title,
        link: `/admin/students`,
      }));
      if (notifs.length > 0) {
        await svc.from("notifications").insert(notifs);
      }
    } catch (e) {
      console.warn("[submitTeacherReport] admin notification failed", e);
    }
  }

  revalidatePath("/teacher/reports");
  if (courseId) revalidatePath(`/teacher/my-courses/${courseId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Course resources
// ─────────────────────────────────────────────────────────────────────────────
export async function addCourseResource(formData: FormData) {
  const { supabase, teacher, profile } = await requireTeacher();
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

  await assertTeacherOwnsCourse(courseId, teacher.id);

  const { error } = await supabase.from("course_resources").insert({
    course_id: courseId,
    name,
    description,
    file_url: fileUrl,
    link_url: linkUrl,
    uploaded_by: profile.id,
  });
  if (error) throw error;

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
    console.warn("[addCourseResource] email/notification failed", e);
  }

  revalidatePath(`/teacher/my-courses/${courseId}`);
  revalidatePath(`/student/my-courses/${courseId}`);
}

export async function deleteCourseResource(formData: FormData) {
  const { supabase, teacher } = await requireTeacher();
  const id = String(formData.get("id") ?? "");
  const courseId = String(formData.get("course_id") ?? "");
  if (!id || !courseId) throw new Error("Missing fields");

  await assertTeacherOwnsCourse(courseId, teacher.id);

  const { error } = await supabase
    .from("course_resources")
    .delete()
    .eq("id", id);
  if (error) throw error;

  revalidatePath(`/teacher/my-courses/${courseId}`);
  revalidatePath(`/student/my-courses/${courseId}`);
}
