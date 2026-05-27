import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminGradeEntry } from "@/components/admin/AdminGradeEntry";
import { AdminResourceManager } from "@/components/admin/AdminResourceManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { deleteCourse } from "@/lib/admin/actions";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Course" };

export default async function CourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: course } = await supabase
    .from("courses")
    .select(
      `id, name, code, description, schedule, capacity, start_date, end_date, is_active,
       program:programs(id, name),
       teacher:teachers(id, profiles(full_name))`,
    )
    .eq("id", params.id)
    .single();

  if (!course) notFound();

  const [
    { data: enrollments },
    { data: assessments },
    { data: grades },
    { data: resources },
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "id, status, enrolled_at, student:students(id, student_number, profiles(full_name, email))",
      )
      .eq("course_id", course.id)
      .order("enrolled_at", { ascending: false }),
    supabase
      .from("assessments")
      .select("id, name, max_score, weight, due_date")
      .eq("course_id", course.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("grades")
      .select("enrollment_id, assessment_id, score, feedback")
      .in(
        "enrollment_id",
        (
          await supabase
            .from("enrollments")
            .select("id")
            .eq("course_id", course.id)
        ).data?.map((e: any) => e.id) ?? [],
      ),
    supabase
      .from("course_resources")
      .select("id, name, description, file_url, link_url, created_at")
      .eq("course_id", course.id)
      .order("created_at", { ascending: false }),
  ]);

  const program = Array.isArray((course as any).program)
    ? (course as any).program[0]
    : (course as any).program;
  const teacher = Array.isArray((course as any).teacher)
    ? (course as any).teacher[0]
    : (course as any).teacher;
  const teacherProfile = Array.isArray(teacher?.profiles)
    ? teacher?.profiles[0]
    : teacher?.profiles;

  const enrollmentsForGrades = (enrollments ?? []).map((e: any) => {
    const s = Array.isArray(e.student) ? e.student[0] : e.student;
    const sProfile = Array.isArray(s?.profiles) ? s?.profiles[0] : s?.profiles;
    return {
      id: e.id,
      student: s
        ? { id: s.id, full_name: sProfile?.full_name ?? "Unknown" }
        : null,
    };
  });

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

  return (
    <div className="space-y-6">
      <Link
        href="/admin/courses"
        className="text-sm text-muted-foreground hover:text-brand-goldlight"
      >
        ← Back to courses
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
            {program?.name ? `${program.name} • ` : ""}
            {teacherProfile?.full_name ?? "Unassigned teacher"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/admin/courses/${course.id}/edit`}>Edit course</Link>
          </Button>
          <form action={deleteCourse}>
            <input type="hidden" name="id" value={course.id} />
            <Button type="submit" variant="destructive" size="sm">
              Delete course
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Schedule" value={course.schedule ?? "—"} />
            <Row label="Capacity" value={String(course.capacity ?? "—")} />
            <Row
              label="Start"
              value={course.start_date ? formatDate(course.start_date) : "—"}
            />
            <Row
              label="End"
              value={course.end_date ? formatDate(course.end_date) : "—"}
            />
            <Row
              label="Status"
              value={course.is_active ? "active" : "archived"}
            />
            {course.description && (
              <div>
                <div className="text-xs uppercase tracking-wider text-brand-gold/70">
                  Description
                </div>
                <p className="mt-1 whitespace-pre-wrap text-foreground/90">
                  {course.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="students">
            <TabsList>
              <TabsTrigger value="students">
                Students ({enrollments?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="grades">
                Grades ({assessments?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="resources">
                Resources ({resources?.length ?? 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students">
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Enrolled</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(enrollments ?? []).length === 0 ? (
                        <TableEmpty colSpan={4}>
                          No students enrolled.
                        </TableEmpty>
                      ) : (
                        (enrollments ?? []).map((e: any) => {
                          const s = Array.isArray(e.student)
                            ? e.student[0]
                            : e.student;
                          const sProfile = Array.isArray(s?.profiles)
                            ? s?.profiles[0]
                            : s?.profiles;
                          return (
                            <TableRow key={e.id}>
                              <TableCell>
                                <Link
                                  href={`/admin/students/${s?.id}`}
                                  className="text-brand-goldlight hover:underline"
                                >
                                  {sProfile?.full_name ?? "—"}
                                </Link>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {sProfile?.email ?? "—"}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(e.enrolled_at)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    e.status === "active"
                                      ? "success"
                                      : "secondary"
                                  }
                                >
                                  {e.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="grades">
              <Card>
                <CardContent className="pt-6">
                  <AdminGradeEntry
                    courseId={course.id}
                    assessments={assessments ?? []}
                    enrollments={enrollmentsForGrades}
                    existingGrades={existingGrades}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="resources">
              <Card>
                <CardContent className="pt-6">
                  <AdminResourceManager
                    courseId={course.id}
                    resources={resources ?? []}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-brand-gold/10 pb-2 last:border-0">
      <span className="text-xs uppercase tracking-wider text-brand-gold/70">
        {label}
      </span>
      <span className="text-foreground/90">{value}</span>
    </div>
  );
}
