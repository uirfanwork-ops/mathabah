import Link from "next/link";
import { redirect } from "next/navigation";

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

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(
      "id, status, enrolled_at, courses(id, name, code, schedule, is_active, teachers(profiles(full_name)))",
    )
    .eq("student_id", student.id)
    .order("enrolled_at", { ascending: false });

  const rows = (enrollments ?? []).map((e) => {
    const c = Array.isArray((e as any).courses)
      ? (e as any).courses[0]
      : (e as any).courses;
    const teacher = Array.isArray(c?.teachers)
      ? c?.teachers[0]
      : c?.teachers;
    const teacherProfile = Array.isArray(teacher?.profiles)
      ? teacher?.profiles[0]
      : teacher?.profiles;
    return { enrollment: e, course: c, teacherName: teacherProfile?.full_name };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-brand-parchment">
          My Courses
        </h1>
        <p className="text-muted-foreground">
          All courses you&apos;re enrolled in — past and present.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrollments</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5}>
                  You&apos;re not enrolled in any courses yet.
                </TableEmpty>
              ) : (
                rows.map(({ enrollment, course, teacherName }) =>
                  course ? (
                    <TableRow key={enrollment.id}>
                      <TableCell>
                        <div className="font-medium text-brand-goldlight">
                          {course.code ? `${course.code} — ` : ""}
                          {course.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {teacherName ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {course.schedule ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            enrollment.status === "active"
                              ? "success"
                              : enrollment.status === "completed"
                                ? "outline"
                                : "secondary"
                          }
                        >
                          {enrollment.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/student/my-courses/${course.id}`}
                          className="text-brand-goldlight hover:underline"
                        >
                          View →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ) : null,
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
