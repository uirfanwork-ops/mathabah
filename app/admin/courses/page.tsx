import Link from "next/link";

import { CourseForm } from "@/components/admin/CourseForm";
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

export const metadata = { title: "Courses" };

export default async function CoursesPage() {
  const supabase = createClient();

  const [{ data: courses }, { data: programs }, { data: teachers }] =
    await Promise.all([
      supabase
        .from("courses")
        .select(
          `id, name, code, schedule, capacity, is_active, start_date,
           program:programs(id, name),
           teacher:teachers(id, profiles(full_name))`,
        )
        .order("created_at", { ascending: false }),
      supabase.from("programs").select("id, name").order("name"),
      supabase
        .from("teachers")
        .select("id, profiles!inner(full_name)")
        .order("created_at"),
    ]);

  const teacherOptions = (teachers ?? []).map((t: any) => ({
    id: t.id,
    full_name: Array.isArray(t.profiles)
      ? t.profiles[0]?.full_name
      : t.profiles?.full_name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          Courses
        </h1>
        <p className="text-muted-foreground">Create and manage courses.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a new course</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseForm
            programs={programs ?? []}
            teachers={teacherOptions}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All courses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(courses ?? []).length === 0 ? (
                <TableEmpty colSpan={7}>No courses yet.</TableEmpty>
              ) : (
                (courses ?? []).map((c: any) => {
                  const program = Array.isArray(c.program)
                    ? c.program[0]
                    : c.program;
                  const teacher = Array.isArray(c.teacher)
                    ? c.teacher[0]
                    : c.teacher;
                  const teacherProfile = Array.isArray(teacher?.profiles)
                    ? teacher?.profiles[0]
                    : teacher?.profiles;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-brand-gold">
                        {c.code ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/courses/${c.id}`}
                          className="font-medium text-brand-goldlight hover:underline"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-brand-ink">
                        {program?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-brand-ink">
                        {teacherProfile?.full_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.schedule ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.is_active ? "success" : "secondary"}>
                          {c.is_active ? "active" : "archived"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/courses/${c.id}/edit`}
                          className="text-xs text-brand-goldlight hover:underline"
                        >
                          Edit
                        </Link>
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
