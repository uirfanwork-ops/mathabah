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
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "My Courses · Student" };

export default async function StudentCoursesPage() {
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
      .select(
        "id, name, code, program_id, schedule, is_active, teachers(profiles(full_name))",
      )
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("enrollments")
      .select("id, status, enrolled_at, course_id")
      .eq("student_id", student.id),
  ]);

  const enrollmentMap = new Map<
    string,
    { id: string; status: string; enrolled_at: string }
  >();
  for (const e of enrollments ?? []) {
    enrollmentMap.set(e.course_id, {
      id: e.id,
      status: e.status,
      enrolled_at: e.enrolled_at,
    });
  }

  type CourseRow = {
    id: string;
    name: string;
    code: string | null;
    schedule: string | null;
    teacherName: string | null;
    enrolled: boolean;
    enrollment?: { id: string; status: string; enrolled_at: string };
  };

  function buildRow(c: any): CourseRow {
    const teacher = Array.isArray(c.teachers)
      ? c.teachers[0]
      : c.teachers;
    const tp = Array.isArray(teacher?.profiles)
      ? teacher?.profiles[0]
      : teacher?.profiles;
    const enrollment = enrollmentMap.get(c.id);
    return {
      id: c.id,
      name: c.name,
      code: c.code,
      schedule: c.schedule,
      teacherName: tp?.full_name ?? null,
      enrolled: !!enrollment,
      enrollment,
    };
  }

  type ProgramGroup = {
    id: string;
    name: string;
    code: string | null;
    courses: CourseRow[];
  };

  const programGroups: ProgramGroup[] = [];
  const ungrouped: CourseRow[] = [];

  const coursesByProgram = new Map<string, any[]>();
  for (const c of courses ?? []) {
    if (c.program_id) {
      const list = coursesByProgram.get(c.program_id) ?? [];
      list.push(c);
      coursesByProgram.set(c.program_id, list);
    } else {
      ungrouped.push(buildRow(c));
    }
  }

  for (const p of programs ?? []) {
    const pCourses = coursesByProgram.get(p.id) ?? [];
    programGroups.push({
      id: p.id,
      name: p.name,
      code: p.code,
      courses: pCourses.map(buildRow),
    });
  }

  if (ungrouped.length > 0) {
    programGroups.push({
      id: "other",
      name: "Other Courses",
      code: null,
      courses: ungrouped,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          My Courses
        </h1>
        <p className="text-muted-foreground">
          Browse all courses by program. Enrolled courses are highlighted.
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
            <CardContent className="space-y-3">
              {program.courses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No courses in this program yet.
                </p>
              ) : (
                program.courses.map((course) => (
                  <div
                    key={course.id}
                    className={`flex items-center justify-between gap-4 rounded-lg border p-4 ${
                      course.enrolled
                        ? "border-brand-gold/30 bg-brand-gold/5"
                        : "border-border/50"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {course.enrolled ? (
                          <Link
                            href={`/student/my-courses/${course.id}`}
                            className="font-bold text-brand-parchment hover:underline"
                          >
                            {course.code ? `${course.code} — ` : ""}
                            {course.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">
                            {course.code ? `${course.code} — ` : ""}
                            {course.name}
                          </span>
                        )}
                        {course.enrolled && (
                          <Badge
                            variant={
                              course.enrollment!.status === "active"
                                ? "success"
                                : course.enrollment!.status === "completed"
                                  ? "outline"
                                  : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {course.enrollment!.status}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        {course.teacherName && (
                          <span>{course.teacherName}</span>
                        )}
                        {course.schedule && <span>{course.schedule}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {course.enrolled ? (
                        <Link
                          href={`/student/my-courses/${course.id}`}
                          className="text-sm text-brand-goldlight hover:underline"
                        >
                          View →
                        </Link>
                      ) : (
                        <EnrollButton courseId={course.id} />
                      )}
                    </div>
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
