import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AttendanceSheet } from "@/components/teacher/AttendanceSheet";
import { CourseResources } from "@/components/teacher/CourseResources";
import { GradeEntry } from "@/components/teacher/GradeEntry";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Course" };

export default async function TeacherCourseDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { date?: string };
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

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, name, code, description, schedule, capacity, start_date, end_date, is_active, teacher_id, program:programs(id, name)",
    )
    .eq("id", params.id)
    .single();

  if (!course || course.teacher_id !== teacher.id) notFound();

  const program = Array.isArray((course as any).program)
    ? (course as any).program[0]
    : (course as any).program;

  // Pull enrollments + the joined student profile
  const { data: enrollmentRows } = await supabase
    .from("enrollments")
    .select(
      "id, status, enrolled_at, student:students(id, profiles(id, full_name))",
    )
    .eq("course_id", course.id)
    .order("enrolled_at");

  const enrollments = (enrollmentRows ?? []).map((e: any) => {
    const s = Array.isArray(e.student) ? e.student[0] : e.student;
    const profile = Array.isArray(s?.profiles) ? s?.profiles[0] : s?.profiles;
    return {
      id: e.id,
      status: e.status,
      enrolled_at: e.enrolled_at,
      student: profile && s ? { id: s.id, full_name: profile.full_name } : null,
    };
  });

  // Assessments + grades + resources for this course
  const [
    { data: assessments },
    { data: grades },
    { data: resources },
  ] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, name, category, description, max_score, weight, due_date")
      .eq("course_id", course.id)
      .order("created_at"),
    supabase
      .from("grades")
      .select(
        "id, score, feedback, enrollment_id, assessment_id, assessment:assessments!inner(course_id)",
      )
      .eq("assessment.course_id", course.id),
    supabase
      .from("course_resources")
      .select("id, name, description, file_url, link_url, created_at")
      .eq("course_id", course.id)
      .order("created_at", { ascending: false }),
  ]);

  const existingGrades: Record<
    string,
    { score: number | null; feedback: string | null }
  > = {};
  for (const g of grades ?? []) {
    existingGrades[`${g.enrollment_id}:${g.assessment_id}`] = {
      score: g.score,
      feedback: g.feedback,
    };
  }

  // Attendance for the selected date (default to today)
  const sessionDate =
    searchParams.date ?? new Date().toISOString().slice(0, 10);
  const enrollmentIds = enrollments.map((e) => e.id);
  let attendanceMap: Record<string, { status: string; notes: string | null }> =
    {};
  if (enrollmentIds.length > 0) {
    const { data: existing } = await supabase
      .from("attendance")
      .select("enrollment_id, status, notes")
      .eq("session_date", sessionDate)
      .in("enrollment_id", enrollmentIds);
    for (const a of existing ?? []) {
      attendanceMap[a.enrollment_id] = { status: a.status, notes: a.notes };
    }
  }

  const enrollmentsWithExisting = enrollments.map((e) => ({
    ...e,
    existing: attendanceMap[e.id] ?? null,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/teacher/my-courses"
        className="text-sm text-muted-foreground hover:text-brand-goldlight"
      >
        ← Back to my courses
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-brand-parchment">
              {course.name}
            </h1>
            {course.code && (
              <Badge variant="outline" className="font-mono">
                {course.code}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {program?.name ?? "—"}
            {course.schedule ? ` • ${course.schedule}` : ""}
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href={`/teacher/reports/new?course_id=${course.id}`}>
            Submit a report
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled students ({enrollments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.length === 0 ? (
                    <TableEmpty colSpan={3}>
                      No students enrolled yet. Ask an admin to assign students.
                    </TableEmpty>
                  ) : (
                    enrollments.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium text-brand-ink">
                          {e.student?.full_name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              e.status === "active" ? "success" : "secondary"
                            }
                          >
                            {e.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {e.student?.id && (
                              <a
                                href={`/api/pdf/student-report/${e.student.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-brand-goldlight hover:underline"
                              >
                                Report PDF
                              </a>
                            )}
                            <Button asChild size="sm" variant="ghost">
                              <Link
                                href={`/teacher/reports/new?student_id=${e.student?.id ?? ""}&course_id=${course.id}`}
                              >
                                Write report
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceSheet
                courseId={course.id}
                defaultDate={sessionDate}
                enrollments={enrollmentsWithExisting}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades">
          <Card>
            <CardHeader>
              <CardTitle>Grades</CardTitle>
            </CardHeader>
            <CardContent>
              <GradeEntry
                courseId={course.id}
                assessments={assessments ?? []}
                enrollments={enrollments}
                existingGrades={existingGrades}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Course resources ({(resources ?? []).length})</CardTitle>
            </CardHeader>
            <CardContent>
              <CourseResources
                courseId={course.id}
                resources={resources ?? []}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
