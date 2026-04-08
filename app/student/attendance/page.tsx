import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
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

export const metadata = { title: "Attendance · Student" };

const ATT_VARIANT: Record<
  string,
  "success" | "destructive" | "outline" | "secondary"
> = {
  present: "success",
  late: "outline",
  excused: "secondary",
  absent: "destructive",
};

type Row = {
  id: string;
  session_date: string;
  status: string;
  notes: string | null;
  enrollments: {
    id: string;
    courses: { id: string; name: string; code: string | null } | null;
  } | null;
};

export default async function StudentAttendancePage() {
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
    .select("id")
    .eq("student_id", student.id);

  const ids = (enrollments ?? []).map((e) => e.id);

  const { data: rawAtt } = ids.length
    ? await supabase
        .from("attendance")
        .select(
          "id, session_date, status, notes, enrollments(id, courses(id, name, code))",
        )
        .in("enrollment_id", ids)
        .order("session_date", { ascending: false })
    : { data: [] };

  const rows = (rawAtt ?? []) as unknown as Row[];

  const total = rows.length;
  const counts = {
    present: rows.filter((r) => r.status === "present").length,
    late: rows.filter((r) => r.status === "late").length,
    excused: rows.filter((r) => r.status === "excused").length,
    absent: rows.filter((r) => r.status === "absent").length,
  };
  const attended = counts.present + counts.late;
  const pct = total > 0 ? Math.round((attended / total) * 100) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-brand-parchment">
          Attendance
        </h1>
        <p className="text-muted-foreground">
          Your full attendance record across every enrolled course.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Overall"
          value={pct === null ? "—" : `${pct}%`}
          hint={total > 0 ? `${attended}/${total} sessions` : "No sessions"}
          accent="emerald"
        />
        <StatCard label="Present" value={counts.present} />
        <StatCard label="Late / Excused" value={counts.late + counts.excused} />
        <StatCard label="Absent" value={counts.absent} accent="red" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={4}>
                  No attendance recorded yet.
                </TableEmpty>
              ) : (
                rows.map((r) => {
                  const enr = Array.isArray((r as any).enrollments)
                    ? (r as any).enrollments[0]
                    : (r as any).enrollments;
                  const course = Array.isArray(enr?.courses)
                    ? enr?.courses[0]
                    : enr?.courses;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(r.session_date)}
                      </TableCell>
                      <TableCell>
                        {course ? (
                          <Link
                            href={`/student/my-courses/${course.id}`}
                            className="text-brand-goldlight hover:underline"
                          >
                            {course.code ? `${course.code} — ` : ""}
                            {course.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ATT_VARIANT[r.status] ?? "outline"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
