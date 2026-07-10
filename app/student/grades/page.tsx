import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { EnrollButton } from "@/components/student/EnrollButton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

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

  const [{ data: programs }, { data: courses }, { data: enrollments }] =
    await Promise.all([
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

  // Pull grades + assessments only to compute each enrolled course's final %.
  // The detailed per-assessment breakdown lives on the course page now.
  let grades: any[] = [];
  let assessments: any[] = [];
  if (enrollmentIds.length > 0) {
    const [{ data: g }, { data: a }] = await Promise.all([
      supabase
        .from("grades")
        .select("score, assessment_id, enrollment_id")
        .in("enrollment_id", enrollmentIds),
      supabase
        .from("assessments")
        .select("id, max_score, weight, course_id")
        .in("course_id", enrolledIds),
    ]);
    grades = g ?? [];
    assessments = a ?? [];
  }

  const gradeMap = new Map<string, number>();
  for (const g of grades) {
    if (g.score !== null && g.score !== undefined) {
      gradeMap.set(`${g.enrollment_id}:${g.assessment_id}`, Number(g.score));
    }
  }

  const assessmentsByCourse = new Map<string, any[]>();
  for (const a of assessments) {
    const list = assessmentsByCourse.get(a.course_id) ?? [];
    list.push(a);
    assessmentsByCourse.set(a.course_id, list);
  }

  type CourseRow = {
    id: string;
    name: string;
    code: string | null;
    enrolled: boolean;
    assessmentCount: number;
    percentage: number | null;
  };

  type ProgramGroup = {
    id: string;
    name: string;
    code: string | null;
    courses: CourseRow[];
  };

  function buildCourseRow(c: any): CourseRow {
    const enrollment = enrollmentMap.get(c.id);
    const enrolled = !!enrollment;
    const courseAssessments = assessmentsByCourse.get(c.id) ?? [];

    let percentage: number | null = null;
    if (enrolled && courseAssessments.length > 0) {
      let weightSum = 0;
      let scoreSum = 0;
      for (const a of courseAssessments) {
        const score = gradeMap.get(`${enrollment!.id}:${a.id}`);
        if (score !== undefined) {
          const pct = score / Number(a.max_score);
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
      assessmentCount: courseAssessments.length,
      percentage,
    };
  }

  const coursesByProgram = new Map<string, any[]>();
  const ungrouped: any[] = [];
  for (const c of courses ?? []) {
    if (c.program_id) {
      const list = coursesByProgram.get(c.program_id) ?? [];
      list.push(c);
      coursesByProgram.set(c.program_id, list);
    } else {
      ungrouped.push(c);
    }
  }

  const programGroups: ProgramGroup[] = [];
  for (const p of programs ?? []) {
    const pCourses = coursesByProgram.get(p.id) ?? [];
    programGroups.push({
      id: p.id,
      name: p.name,
      code: p.code,
      courses: pCourses.map(buildCourseRow),
    });
  }
  if (ungrouped.length > 0) {
    programGroups.push({
      id: "other",
      name: "Other Courses",
      code: null,
      courses: ungrouped.map(buildCourseRow),
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">Grades</h1>
        <p className="text-muted-foreground">
          Pick a course to see its full breakdown of assessments and grades.
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
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {program.courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No courses in this program yet.
                </p>
              ) : (
                program.courses.map((course) =>
                  course.enrolled ? (
                    <Link
                      key={course.id}
                      href={`/student/my-courses/${course.id}`}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-brand-gold/30 bg-brand-gold/5 p-4 transition hover:border-brand-gold/60 hover:bg-brand-gold/10"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-bold text-brand-ink">
                            {course.code ? `${course.code} — ` : ""}
                            {course.name}
                          </span>
                          <Badge variant="success" className="text-[10px]">
                            enrolled
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {course.assessmentCount === 0
                            ? "No assessments yet"
                            : `${course.assessmentCount} assessment${course.assessmentCount === 1 ? "" : "s"}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {course.percentage !== null && (
                          <span className="text-lg font-semibold text-brand-ink">
                            {course.percentage.toFixed(1)}%
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 shrink-0 text-brand-gold transition group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  ) : (
                    <div
                      key={course.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-4"
                    >
                      <span className="min-w-0 truncate text-sm text-muted-foreground">
                        {course.code ? `${course.code} — ` : ""}
                        {course.name}
                      </span>
                      <EnrollButton courseId={course.id} />
                    </div>
                  ),
                )
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
