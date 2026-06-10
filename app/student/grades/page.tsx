import Link from "next/link";
import { redirect } from "next/navigation";

import { EnrollButton } from "@/components/student/EnrollButton";
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
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Grades · Student" };

export default async function StudentGradesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!student) redirect("/dashboard");

  const [
    { data: programs },
    { data: courses },
    { data: enrollments },
  ] = await Promise.all([
    supabase
      .from("programs")
      .select("id, name, code")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("courses")
      .select("id, name, code, program_id, is_active")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("enrollments")
      .select("id, status, course_id")
      .eq("student_id", student.id),
  ]);

  const enrollmentMap = new Map<string, { id: string; status: string }>();
  for (const e of enrollments ?? []) {
    enrollmentMap.set(e.course_id, { id: e.id, status: e.status });
  }

  const enrolledIds = Array.from(enrollmentMap.keys());
  const enrollmentIds = (enrollments ?? [])
    .filter((e: any) => e.status === "active")
    .map((e: any) => e.id);

  let grades: any[] = [];
  let assessments: any[] = [];
  if (enrollmentIds.length > 0) {
    const [{ data: g }, { data: a }] = await Promise.all([
      supabase
        .from("grades")
        .select(
          "id, score, feedback, created_at, assessment_id, enrollment_id",
        )
        .in("enrollment_id", enrollmentIds),
      supabase
        .from("assessments")
        .select("id, name, max_score, weight, due_date, course_id")
        .in(
          "course_id",
          enrolledIds,
        )
        .order("due_date", { ascending: true, nullsFirst: false }),
    ]);
    grades = g ?? [];
    assessments = a ?? [];
  }

  const gradeMap = new Map<string, { score: number; feedback: string | null }>();
  for (const g of grades) {
    gradeMap.set(`${g.enrollment_id}:${g.assessment_id}`, {
      score: g.score,
      feedback: g.feedback,
    });
  }

  const assessmentsByCourse = new Map<string, any[]>();
  for (const a of assessments) {
    const list = assessmentsByCourse.get(a.course_id) ?? [];
    list.push(a);
    assessmentsByCourse.set(a.course_id, list);
  }

  type ProgramGroup = {
    id: string;
    name: string;
    code: string | null;
    courses: CourseRow[];
  };

  type CourseRow = {
    id: string;
    name: string;
    code: string | null;
    enrolled: boolean;
    enrollment?: { id: string; status: string };
    assessments: any[];
    percentage: number | null;
  };

  const programGroups: ProgramGroup[] = [];
  const ungroupedCourses: CourseRow[] = [];

  function buildCourseRow(c: any): CourseRow {
    const enrollment = enrollmentMap.get(c.id);
    const enrolled = !!enrollment;
    const courseAssessments = assessmentsByCourse.get(c.id) ?? [];

    let percentage: number | null = null;
    if (enrolled && courseAssessments.length > 0) {
      let weightSum = 0;
      let scoreSum = 0;
      for (const a of courseAssessments) {
        const g = gradeMap.get(`${enrollment!.id}:${a.id}`);
        if (g && g.score !== null && g.score !== undefined) {
          const pct = Number(g.score) / Number(a.max_score);
          scoreSum += pct * Number(a.weight);
          weightSum += Number(a.weight);
        }
      }
      if (weightSum > 0) percentage = (scoreSum / weightSum) * 100;
    }

    return {
      id: c.id,
      name: c.name,
      code: c.code,
      enrolled,
      enrollment,
      assessments: courseAssessments,
      percentage,
    };
  }

  const coursesByProgram = new Map<string, any[]>();
  for (const c of courses ?? []) {
    if (c.program_id) {
      const list = coursesByProgram.get(c.program_id) ?? [];
      list.push(c);
      coursesByProgram.set(c.program_id, list);
    } else {
      ungroupedCourses.push(buildCourseRow(c));
    }
  }

  for (const p of programs ?? []) {
    const pCourses = coursesByProgram.get(p.id) ?? [];
    programGroups.push({
      id: p.id,
      name: p.name,
      code: p.code,
      courses: pCourses.map(buildCourseRow),
    });
  }

  if (ungroupedCourses.length > 0) {
    programGroups.push({
      id: "other",
      name: "Other Courses",
      code: null,
      courses: ungroupedCourses,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">Grades</h1>
        <p className="text-muted-foreground">
          Your assessments and grades, organized by program and course.
        </p>
      </div>

      {programGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No programs or courses available yet.
          </CardContent>
        </Card>
      ) : (
        programGroups.map((program) => (
          <Card key={program.id}>
            <CardHeader>
              <CardTitle className="text-brand-parchment">
                {program.code ? `${program.code} — ` : ""}
                {program.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {program.courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No courses in this program yet.
                </p>
              ) : (
                program.courses.map((course) => (
                  <div
                    key={course.id}
                    className={`rounded-lg border p-4 ${
                      course.enrolled
                        ? "border-brand-gold/30 bg-brand-gold/5"
                        : "border-border/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {course.enrolled ? (
                          <Link
                            href={`/student/my-courses/${course.id}`}
                            className={`text-base hover:underline ${
                              course.enrolled
                                ? "font-bold text-brand-parchment"
                                : "text-muted-foreground"
                            }`}
                          >
                            {course.code ? `${course.code} — ` : ""}
                            {course.name}
                          </Link>
                        ) : (
                          <span className="text-base text-muted-foreground">
                            {course.code ? `${course.code} — ` : ""}
                            {course.name}
                          </span>
                        )}
                        {course.enrolled && (
                          <Badge variant="success" className="text-[10px]">
                            enrolled
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {course.percentage !== null && (
                          <span className="text-lg font-semibold text-brand-parchment">
                            {course.percentage.toFixed(1)}%
                          </span>
                        )}
                        {!course.enrolled && (
                          <EnrollButton courseId={course.id} />
                        )}
                      </div>
                    </div>

                    {course.enrolled && course.assessments.length > 0 && (
                      <div className="mt-3">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Assessment</TableHead>
                              <TableHead>Due</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Feedback</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {course.assessments.map((a: any) => {
                              const g = gradeMap.get(
                                `${course.enrollment!.id}:${a.id}`,
                              );
                              return (
                                <TableRow key={a.id}>
                                  <TableCell className="font-medium text-brand-ink">
                                    {a.name}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {a.due_date
                                      ? formatDate(a.due_date)
                                      : "—"}
                                  </TableCell>
                                  <TableCell>
                                    {g?.score !== null &&
                                    g?.score !== undefined ? (
                                      <span className="font-mono text-brand-ink">
                                        {g.score} / {a.max_score}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        Not graded
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="max-w-md text-muted-foreground">
                                    {g?.feedback ?? "—"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {course.enrolled && course.assessments.length === 0 && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No assessments published yet.
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
