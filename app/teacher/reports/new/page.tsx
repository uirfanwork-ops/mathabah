import Link from "next/link";
import { redirect } from "next/navigation";

import { ReportForm } from "@/components/teacher/ReportForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "New report" };

export default async function NewTeacherReportPage({
  searchParams,
}: {
  searchParams: { student_id?: string; course_id?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!teacher) redirect("/teacher");

  // All courses owned by this teacher
  const { data: courses } = await supabase
    .from("courses")
    .select("id, name, code")
    .eq("teacher_id", teacher.id)
    .order("name");

  // Distinct enrolled students across all teacher's courses
  const { data: rows } = await supabase
    .from("enrollments")
    .select(
      "student:students(id, profiles(full_name)), course:courses!inner(id, name, code, teacher_id)",
    )
    .eq("course.teacher_id", teacher.id);

  const seen = new Set<string>();
  const students: { id: string; full_name: string; course_label: string | null }[] = [];
  for (const r of (rows ?? []) as any[]) {
    const s = Array.isArray(r.student) ? r.student[0] : r.student;
    const profile = Array.isArray(s?.profiles)
      ? s?.profiles[0]
      : s?.profiles;
    const course = Array.isArray(r.course) ? r.course[0] : r.course;
    if (!s || !profile || seen.has(s.id)) continue;
    seen.add(s.id);
    students.push({
      id: s.id,
      full_name: profile.full_name,
      course_label: course?.code ?? course?.name ?? null,
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/teacher/reports"
        className="text-sm text-muted-foreground hover:text-brand-goldlight"
      >
        ← Back to reports
      </Link>
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          Submit a report
        </h1>
        <p className="text-muted-foreground">
          Mid-course, end-of-course, or flag a concern.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Report details</CardTitle>
        </CardHeader>
        <CardContent>
          <ReportForm
            students={students}
            courses={courses ?? []}
            defaultStudentId={searchParams.student_id}
            defaultCourseId={searchParams.course_id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
