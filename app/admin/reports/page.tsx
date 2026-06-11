import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Reports" };

const TYPE_LABEL: Record<string, string> = {
  mid_course: "Mid-course",
  end_of_course: "End of course",
  concern: "Concern",
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { type?: string; q?: string };
}) {
  const supabase = createClient();
  const typeFilter = searchParams.type ?? "";
  const q = (searchParams.q ?? "").trim();

  let query = supabase
    .from("teacher_reports")
    .select(
      "id, title, content, type, is_visible_to_student, created_at, student:students(id, profiles(full_name)), teacher:teachers(id, profiles(full_name)), course:courses(name, code)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (typeFilter) query = query.eq("type", typeFilter);
  if (q) query = query.ilike("title", `%${q}%`);

  const { data: reports } = await query;
  const rows = reports ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          Teacher reports
        </h1>
        <p className="text-muted-foreground">
          Every mid-course, end-of-course, and concern report submitted by
          teachers. PDF export is available per row.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[200px_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select id="type" name="type" defaultValue={typeFilter}>
                <option value="">All types</option>
                <option value="mid_course">Mid-course</option>
                <option value="end_of_course">End of course</option>
                <option value="concern">Concern</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="q">Title contains</Label>
              <Input
                id="q"
                name="q"
                placeholder="e.g. mid-course summary"
                defaultValue={q}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="outline">
                Apply
              </Button>
              <Button asChild variant="ghost">
                <Link href="/admin/reports">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All reports ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={7}>
                  No reports match your filters.
                </TableEmpty>
              ) : (
                rows.map((r: any) => {
                  const student = Array.isArray(r.student)
                    ? r.student[0]
                    : r.student;
                  const studentProfile = Array.isArray(student?.profiles)
                    ? student?.profiles[0]
                    : student?.profiles;
                  const teacher = Array.isArray(r.teacher)
                    ? r.teacher[0]
                    : r.teacher;
                  const teacherProfile = Array.isArray(teacher?.profiles)
                    ? teacher?.profiles[0]
                    : teacher?.profiles;
                  const course = Array.isArray(r.course)
                    ? r.course[0]
                    : r.course;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(r.created_at)}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="font-medium text-brand-ink">
                          {r.title}
                        </div>
                        <div className="line-clamp-1 text-xs text-muted-foreground">
                          {r.content}
                        </div>
                      </TableCell>
                      <TableCell>
                        {student?.id ? (
                          <Link
                            href={`/admin/students/${student.id}`}
                            className="text-brand-goldlight hover:underline"
                          >
                            {studentProfile?.full_name ?? "—"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {teacher?.id ? (
                          <Link
                            href={`/admin/teachers/${teacher.id}`}
                            className="text-brand-goldlight hover:underline"
                          >
                            {teacherProfile?.full_name ?? "—"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-brand-ink">
                        {course?.name
                          ? `${course.code ? `${course.code} — ` : ""}${course.name}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.type === "concern" ? "destructive" : "outline"
                          }
                        >
                          {TYPE_LABEL[r.type] ?? r.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={`/api/pdf/teacher-report/${r.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-brand-goldlight hover:underline"
                        >
                          PDF →
                        </a>
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
