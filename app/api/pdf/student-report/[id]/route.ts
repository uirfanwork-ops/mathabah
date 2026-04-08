import { NextResponse } from "next/server";
import { createElement } from "react";

import {
  StudentReportPDF,
  type StudentReportData,
} from "@/components/pdf/StudentReportPDF";
import { pdfResponse, renderPdfToBuffer } from "@/lib/pdf/render";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pdf/student-report/[id] — student id from public.students
// Access:
//   * admins: any student
//   * teachers: students enrolled in one of their courses
//   * students: only themselves
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

  // Load the target student. RLS takes care of most checks; we still add
  // an extra guard below for teachers.
  const { data: studentRow, error: studentErr } = await supabase
    .from("students")
    .select(
      "id, student_number, enrollment_date, profile_id, profiles!inner(full_name, email)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (studentErr || !studentRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Self-check for student role
  if (me.role === "student" && studentRow.profile_id !== me.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Teacher: verify the student is in one of their courses
  if (me.role === "teacher") {
    const { data: teacher } = await supabase
      .from("teachers")
      .select("id")
      .eq("profile_id", me.id)
      .single();
    if (!teacher) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { count } = await supabase
      .from("enrollments")
      .select("id, courses!inner(teacher_id)", { count: "exact", head: true })
      .eq("student_id", studentRow.id)
      .eq("courses.teacher_id", teacher.id);
    if (!count) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  // Load enrollments for the student and the associated courses
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "id, status, courses(id, name, code, teachers(profiles(full_name)))",
    )
    .eq("student_id", studentRow.id);

  const enrollmentIds = (enrollments ?? []).map((e) => e.id);

  // Pull all grades for these enrollments
  const { data: gradesRaw } = enrollmentIds.length
    ? await supabase
        .from("grades")
        .select(
          "enrollment_id, score, feedback, assessments(name, max_score, weight, due_date, course_id)",
        )
        .in("enrollment_id", enrollmentIds)
    : { data: [] };

  // Pull all attendance rows
  const { data: attendanceRaw } = enrollmentIds.length
    ? await supabase
        .from("attendance")
        .select("enrollment_id, status")
        .in("enrollment_id", enrollmentIds)
    : { data: [] };

  const courses: StudentReportData["courses"] = [];
  let overallTotal = 0;
  let overallAttended = 0;
  let cumScorePct = 0;
  let cumWeight = 0;

  for (const e of enrollments ?? []) {
    const c = Array.isArray((e as any).courses)
      ? (e as any).courses[0]
      : (e as any).courses;
    if (!c) continue;

    const tWrap = Array.isArray(c.teachers) ? c.teachers[0] : c.teachers;
    const tProfile = Array.isArray(tWrap?.profiles)
      ? tWrap?.profiles[0]
      : tWrap?.profiles;

    const gradesForCourse = (gradesRaw ?? [])
      .filter((g: any) => g.enrollment_id === e.id)
      .map((g: any) => {
        const a = Array.isArray(g.assessments)
          ? g.assessments[0]
          : g.assessments;
        return {
          name: a?.name ?? "—",
          dueDate: a?.due_date ?? null,
          score: g.score ?? null,
          maxScore: Number(a?.max_score ?? 100),
          weight: Number(a?.weight ?? 1),
          feedback: g.feedback ?? null,
        };
      });

    // Weighted average
    let wSum = 0;
    let sSum = 0;
    for (const g of gradesForCourse) {
      if (g.score === null) continue;
      sSum += (Number(g.score) / g.maxScore) * g.weight;
      wSum += g.weight;
    }
    const weightedAveragePct = wSum > 0 ? (sSum / wSum) * 100 : null;
    if (weightedAveragePct !== null) {
      cumScorePct += weightedAveragePct * wSum;
      cumWeight += wSum;
    }

    // Attendance tallies
    const attRows = (attendanceRaw ?? []).filter(
      (a: any) => a.enrollment_id === e.id,
    );
    const tallies = {
      total: attRows.length,
      present: attRows.filter((a: any) => a.status === "present").length,
      late: attRows.filter((a: any) => a.status === "late").length,
      excused: attRows.filter((a: any) => a.status === "excused").length,
      absent: attRows.filter((a: any) => a.status === "absent").length,
    };
    overallTotal += tallies.total;
    overallAttended += tallies.present + tallies.late;

    courses.push({
      id: c.id,
      name: c.name,
      code: c.code ?? null,
      teacherName: tProfile?.full_name ?? null,
      status: e.status,
      weightedAveragePct,
      assessments: gradesForCourse,
      attendance: tallies,
    });
  }

  const studentProfile = Array.isArray((studentRow as any).profiles)
    ? (studentRow as any).profiles[0]
    : (studentRow as any).profiles;

  const data: StudentReportData = {
    generatedAt: new Date().toISOString(),
    student: {
      fullName: studentProfile?.full_name ?? "Unknown student",
      email: studentProfile?.email ?? "",
      studentNumber: studentRow.student_number ?? null,
      enrollmentDate: studentRow.enrollment_date ?? null,
    },
    courses,
    overall: {
      attendancePct:
        overallTotal > 0
          ? Math.round((overallAttended / overallTotal) * 100)
          : null,
      totalSessions: overallTotal,
      attendedSessions: overallAttended,
      cumulativeAveragePct: cumWeight > 0 ? cumScorePct / cumWeight : null,
    },
  };

  const buf = await renderPdfToBuffer(
    createElement(StudentReportPDF, { data }),
  );
  const safeName = (studentProfile?.full_name ?? "student")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return pdfResponse(buf, `mathabah-report-${safeName}.pdf`);
}
