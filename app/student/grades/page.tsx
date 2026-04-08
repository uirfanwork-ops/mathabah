import Link from "next/link";
import { redirect } from "next/navigation";

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

type GradeRow = {
  id: string;
  score: number | null;
  feedback: string | null;
  created_at: string;
  assessments: {
    id: string;
    name: string;
    max_score: number;
    weight: number;
    due_date: string | null;
    course_id: string;
    courses: { id: string; name: string; code: string | null } | null;
  } | null;
};

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

  // Pull all enrollments with their graded assessments
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("id, courses(id, name, code)")
    .eq("student_id", student.id);

  const enrollmentIds = (enrollments ?? []).map((e) => e.id);

  const { data: rawGrades } = enrollmentIds.length
    ? await supabase
        .from("grades")
        .select(
          "id, score, feedback, created_at, assessments(id, name, max_score, weight, due_date, course_id, courses(id, name, code))",
        )
        .in("enrollment_id", enrollmentIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  const grades = (rawGrades ?? []) as unknown as GradeRow[];

  // Group by course
  type CourseGroup = {
    courseId: string;
    courseName: string;
    courseCode: string | null;
    rows: GradeRow[];
    weightedAvg: number | null;
  };
  const groups = new Map<string, CourseGroup>();

  for (const g of grades) {
    const asm = Array.isArray((g as any).assessments)
      ? (g as any).assessments[0]
      : (g as any).assessments;
    if (!asm) continue;
    const course = Array.isArray(asm.courses)
      ? asm.courses[0]
      : asm.courses;
    if (!course) continue;

    let group = groups.get(course.id);
    if (!group) {
      group = {
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        rows: [],
        weightedAvg: null,
      };
      groups.set(course.id, group);
    }
    group.rows.push({ ...g, assessments: asm });
  }

  // Compute weighted average per course
  for (const group of groups.values()) {
    let weightSum = 0;
    let scoreSum = 0;
    for (const r of group.rows) {
      const asm = r.assessments!;
      if (r.score === null || r.score === undefined) continue;
      const pct = Number(r.score) / Number(asm.max_score);
      scoreSum += pct * Number(asm.weight);
      weightSum += Number(asm.weight);
    }
    group.weightedAvg = weightSum > 0 ? (scoreSum / weightSum) * 100 : null;
  }

  const courseGroups = Array.from(groups.values());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-brand-parchment">
          Grades
        </h1>
        <p className="text-muted-foreground">
          Your graded assessments grouped by course, with weighted averages.
        </p>
      </div>

      {courseGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No grades recorded yet.
          </CardContent>
        </Card>
      ) : (
        courseGroups.map((group) => (
          <Card key={group.courseId}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  <Link
                    href={`/student/my-courses/${group.courseId}`}
                    className="hover:underline"
                  >
                    {group.courseCode ? `${group.courseCode} — ` : ""}
                    {group.courseName}
                  </Link>
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {group.rows.length} assessment
                  {group.rows.length === 1 ? "" : "s"} graded
                </p>
              </div>
              {group.weightedAvg !== null && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Weighted avg
                  </p>
                  <p className="font-serif text-2xl text-brand-goldlight">
                    {group.weightedAvg.toFixed(1)}%
                  </p>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assessment</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.length === 0 ? (
                    <TableEmpty colSpan={5}>No grades yet.</TableEmpty>
                  ) : (
                    group.rows.map((r) => {
                      const a = r.assessments!;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium text-brand-goldlight">
                            {a.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.due_date ? formatDate(a.due_date) : "—"}
                          </TableCell>
                          <TableCell className="font-mono">
                            {r.score !== null ? (
                              <>
                                {r.score} / {a.max_score}
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.weight}
                          </TableCell>
                          <TableCell className="max-w-md text-muted-foreground">
                            {r.feedback ?? "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
