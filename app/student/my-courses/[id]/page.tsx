import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, Link as LinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { groupByCategory } from "@/lib/assessment-categories";

export const metadata = { title: "Course · Student" };

const ATT_VARIANT: Record<
  string,
  "success" | "destructive" | "outline" | "secondary"
> = {
  present: "success",
  late: "outline",
  excused: "secondary",
  absent: "destructive",
};

export default async function StudentCourseDetailPage({
  params,
}: {
  params: { id: string };
}) {
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

  const { data: course } = await supabase
    .from("courses")
    .select(
      "id, name, code, description, schedule, start_date, end_date, is_active, programs(name), teachers(profiles(full_name, email))",
    )
    .eq("id", params.id)
    .single();
  if (!course) notFound();

  // Find the student's enrollment in this course (RLS ensures only theirs returns).
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("course_id", params.id)
    .eq("student_id", student.id)
    .maybeSingle();

  if (!enrollment) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/student/my-courses"
            className="text-xs text-muted-foreground hover:text-brand-goldlight"
          >
            ← Back to my courses
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-brand-parchment">
            {course.name}
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Not enrolled</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You&apos;re not enrolled in this course.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [
    { data: assessments },
    { data: grades },
    { data: attendance },
    { data: resources },
  ] = await Promise.all([
    supabase
      .from("assessments")
      .select("id, name, category, max_score, weight, due_date")
      .eq("course_id", params.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("grades")
      .select("id, assessment_id, score, feedback, created_at")
      .eq("enrollment_id", enrollment.id),
    supabase
      .from("attendance")
      .select("id, session_date, status, notes")
      .eq("enrollment_id", enrollment.id)
      .order("session_date", { ascending: false }),
    supabase
      .from("course_resources")
      .select("id, name, description, file_url, link_url, created_at")
      .eq("course_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const gradeByAssessment = new Map<
    string,
    { score: number | null; feedback: string | null }
  >();
  for (const g of grades ?? []) {
    gradeByAssessment.set(g.assessment_id, {
      score: g.score,
      feedback: g.feedback,
    });
  }

  // Weighted final percentage across every graded assessment.
  let finalPercentage: number | null = null;
  {
    let weightSum = 0;
    let scoreSum = 0;
    for (const a of assessments ?? []) {
      const g = gradeByAssessment.get(a.id);
      if (g && g.score !== null && g.score !== undefined) {
        const pct = Number(g.score) / Number(a.max_score);
        scoreSum += pct * Number(a.weight);
        weightSum += Number(a.weight);
      }
    }
    if (weightSum > 0) finalPercentage = (scoreSum / weightSum) * 100;
  }

  const assessmentGroups = groupByCategory(assessments ?? []);

  const teachers = Array.isArray((course as any).teachers)
    ? (course as any).teachers[0]
    : (course as any).teachers;
  const teacherProfile = Array.isArray(teachers?.profiles)
    ? teachers?.profiles[0]
    : teachers?.profiles;
  const programs = Array.isArray((course as any).programs)
    ? (course as any).programs[0]
    : (course as any).programs;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/student/my-courses"
          className="text-xs text-muted-foreground hover:text-brand-goldlight"
        >
          ← Back to my courses
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-brand-parchment">
              {course.code ? `${course.code} — ` : ""}
              {course.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {programs?.name ? `${programs.name} · ` : ""}
              {teacherProfile?.full_name ?? "No teacher assigned"}
            </p>
          </div>
          <Badge variant={course.is_active ? "success" : "secondary"}>
            {course.is_active ? "active" : "archived"}
          </Badge>
        </div>
        {course.description && (
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            {course.description}
          </p>
        )}
      </div>

      <Tabs defaultValue="grades">
        <TabsList>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="info">Course info</TabsTrigger>
        </TabsList>

        <TabsContent value="grades">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>Assessments &amp; grades</CardTitle>
              {finalPercentage !== null && (
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Final grade
                  </div>
                  <div className="text-2xl font-semibold text-brand-goldlight">
                    {finalPercentage.toFixed(1)}%
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {assessmentGroups.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No assessments published yet.
                </p>
              ) : (
                assessmentGroups.map((group) => (
                  <div key={group.value}>
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-gold">
                      {group.label}
                    </div>
                    <div className="overflow-hidden rounded-md border">
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
                          {group.items.map((a: any) => {
                            const g = gradeByAssessment.get(a.id);
                            return (
                              <TableRow key={a.id}>
                                <TableCell className="font-medium text-brand-ink">
                                  {a.name}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {a.due_date ? formatDate(a.due_date) : "—"}
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
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(attendance ?? []).length === 0 ? (
                    <TableEmpty colSpan={3}>
                      No attendance recorded yet.
                    </TableEmpty>
                  ) : (
                    (attendance ?? []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-sm">
                          {formatDate(a.session_date)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ATT_VARIANT[a.status] ?? "outline"}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {a.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources">
          <Card>
            <CardHeader>
              <CardTitle>Course resources ({(resources ?? []).length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(resources ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No resources have been shared for this course yet.
                </p>
              ) : (
                (resources ?? []).map((r) => {
                  const href = r.file_url || r.link_url || "#";
                  const Icon = r.file_url ? FileText : LinkIcon;
                  return (
                    <a
                      key={r.id}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-3 rounded-md border border-brand-gold/15 bg-brand-ink/30 p-3 hover:bg-brand-gold/5"
                    >
                      <Icon className="mt-1 h-4 w-4 shrink-0 text-brand-gold" />
                      <div className="flex-1">
                        <div className="font-medium text-brand-goldlight">
                          {r.name}
                        </div>
                        {r.description && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {r.description}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                          {formatDate(r.created_at)}
                        </p>
                      </div>
                    </a>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Course information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              <InfoRow label="Program" value={programs?.name} />
              <InfoRow label="Teacher" value={teacherProfile?.full_name} />
              <InfoRow label="Schedule" value={course.schedule} />
              <InfoRow
                label="Start date"
                value={course.start_date ? formatDate(course.start_date) : null}
              />
              <InfoRow
                label="End date"
                value={course.end_date ? formatDate(course.end_date) : null}
              />
              <InfoRow label="Status" value={course.is_active ? "Active" : "Archived"} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-brand-goldlight">{value || "—"}</p>
    </div>
  );
}
