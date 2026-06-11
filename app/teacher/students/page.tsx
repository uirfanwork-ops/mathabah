import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export const metadata = { title: "Students" };

export default async function TeacherStudentsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  // RLS allows the teacher to see enrollments for their own courses, so we
  // can pull all enrollments and aggregate by student in JS.
  const { data: rows } = teacher
    ? await supabase
        .from("enrollments")
        .select(
          "id, status, course:courses!inner(id, name, code, teacher_id), student:students(id, profiles(full_name, email))",
        )
        .eq("course.teacher_id", teacher.id)
    : { data: [] };

  type Aggregated = {
    id: string;
    name: string;
    email: string;
    courses: { id: string; label: string; status: string }[];
  };
  const byStudent = new Map<string, Aggregated>();

  for (const r of (rows ?? []) as any[]) {
    const s = Array.isArray(r.student) ? r.student[0] : r.student;
    const sProfile = Array.isArray(s?.profiles)
      ? s?.profiles[0]
      : s?.profiles;
    const c = Array.isArray(r.course) ? r.course[0] : r.course;
    if (!s || !sProfile || !c) continue;
    const existing: Aggregated = byStudent.get(s.id) ?? {
      id: s.id,
      name: sProfile.full_name,
      email: sProfile.email,
      courses: [],
    };
    existing.courses.push({
      id: c.id,
      label: c.code ? `${c.code}` : c.name,
      status: r.status,
    });
    byStudent.set(s.id, existing);
  }

  const students = Array.from(byStudent.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          Students
        </h1>
        <p className="text-muted-foreground">
          All students enrolled in your courses.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Courses</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableEmpty colSpan={4}>
              No students enrolled in your courses yet.
            </TableEmpty>
          ) : (
            students.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium text-brand-ink">
                  {s.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {s.email}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {s.courses.map((c) => (
                      <Badge key={`${s.id}-${c.id}`} variant="outline">
                        {c.label}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/teacher/reports/new?student_id=${s.id}`}>
                      Write report
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
