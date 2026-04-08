import { NextResponse } from "next/server";
import { createElement } from "react";

import {
  TeacherReportPDF,
  type TeacherReportData,
} from "@/components/pdf/TeacherReportPDF";
import { pdfResponse, renderPdfToBuffer } from "@/lib/pdf/render";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pdf/teacher-report/[id] — teacher_reports.id
// Access:
//   * admins: any report
//   * teachers: only their own reports
//   * students: only reports where is_visible_to_student = true (RLS enforced)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .single();
  if (!me || me.status !== "approved") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // RLS enforces all the row-level checks already. We select everything we
  // need with FK embeds and let Postgres return null if the caller can't
  // see it.
  const { data: report, error } = await supabase
    .from("teacher_reports")
    .select(
      "id, title, content, type, is_visible_to_student, created_at, " +
        "teachers!inner(profiles!inner(full_name, email)), " +
        "students!inner(student_number, profiles!inner(full_name)), " +
        "courses(name, code)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !report) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const teacherRel = Array.isArray((report as any).teachers)
    ? (report as any).teachers[0]
    : (report as any).teachers;
  const teacherProfile = Array.isArray(teacherRel?.profiles)
    ? teacherRel?.profiles[0]
    : teacherRel?.profiles;

  const studentRel = Array.isArray((report as any).students)
    ? (report as any).students[0]
    : (report as any).students;
  const studentProfile = Array.isArray(studentRel?.profiles)
    ? studentRel?.profiles[0]
    : studentRel?.profiles;

  const courseRel = Array.isArray((report as any).courses)
    ? (report as any).courses[0]
    : (report as any).courses;

  const data: TeacherReportData = {
    generatedAt: new Date().toISOString(),
    report: {
      id: report.id,
      title: report.title,
      content: report.content,
      type: report.type,
      isVisibleToStudent: report.is_visible_to_student,
      createdAt: report.created_at,
    },
    teacher: {
      fullName: teacherProfile?.full_name ?? "Instructor",
      email: teacherProfile?.email ?? "",
    },
    student: {
      fullName: studentProfile?.full_name ?? "Student",
      studentNumber: studentRel?.student_number ?? null,
    },
    course: courseRel
      ? { name: courseRel.name, code: courseRel.code ?? null }
      : null,
  };

  const buf = await renderPdfToBuffer(
    createElement(TeacherReportPDF, { data }),
  );
  const safeTitle = report.title.replace(/\s+/g, "-").toLowerCase().slice(0, 40);
  return pdfResponse(buf, `mathabah-report-${safeTitle}.pdf`);
}
