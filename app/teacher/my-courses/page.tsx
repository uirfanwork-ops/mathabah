import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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

export const metadata = { title: "My Courses" };

export default async function MyCoursesPage() {
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

  const { data: courses } = teacher
    ? await supabase
        .from("courses")
        .select(
          "id, name, code, schedule, capacity, start_date, end_date, is_active",
        )
        .eq("teacher_id", teacher.id)
        .order("name")
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-brand-parchment">
          My Courses
        </h1>
        <p className="text-muted-foreground">
          Courses you teach this term.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Schedule</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(courses ?? []).length === 0 ? (
            <TableEmpty colSpan={5}>
              You aren&apos;t assigned to any courses yet.
            </TableEmpty>
          ) : (
            (courses ?? []).map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs text-brand-gold">
                  {c.code ?? "—"}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/teacher/my-courses/${c.id}`}
                    className="font-medium text-brand-goldlight hover:underline"
                  >
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.schedule ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {c.start_date ? formatDate(c.start_date) : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant={c.is_active ? "success" : "secondary"}>
                    {c.is_active ? "active" : "archived"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
