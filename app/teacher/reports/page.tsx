import Link from "next/link";

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
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Reports" };

export default async function TeacherReportsPage() {
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

  const { data: reports } = teacher
    ? await supabase
        .from("teacher_reports")
        .select(
          "id, type, title, content, is_visible_to_student, created_at, student:students(id, profiles(full_name)), course:courses(id, name, code)",
        )
        .eq("teacher_id", teacher.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-brand-parchment">
            Reports
          </h1>
          <p className="text-muted-foreground">
            All reports you have submitted.
          </p>
        </div>
        <Button asChild variant="secondary">
          <Link href="/teacher/reports/new">Submit new report</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submitted reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Visible</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reports ?? []).length === 0 ? (
                <TableEmpty colSpan={7}>No reports submitted yet.</TableEmpty>
              ) : (
                (reports ?? []).map((r: any) => {
                  const s = Array.isArray(r.student) ? r.student[0] : r.student;
                  const sProfile = Array.isArray(s?.profiles)
                    ? s?.profiles[0]
                    : s?.profiles;
                  const c = Array.isArray(r.course) ? r.course[0] : r.course;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDate(r.created_at)}
                      </TableCell>
                      <TableCell className="font-medium text-brand-ink">
                        {sProfile?.full_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-brand-ink">
                        {c?.code ?? c?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-brand-ink">{r.title}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.type === "concern" ? "destructive" : "outline"
                          }
                        >
                          {r.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.is_visible_to_student ? (
                          <Badge variant="success">visible</Badge>
                        ) : (
                          <Badge variant="secondary">internal</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={`/api/pdf/teacher-report/${r.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-goldlight hover:underline"
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
