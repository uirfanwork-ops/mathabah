import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export const metadata = { title: "Students" };

interface SearchParams {
  q?: string;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const q = (searchParams.q ?? "").trim();

  // Pull student-role profiles joined to their students row. Contact fields
  // (city, country) live on profiles themselves after migration 0003; only
  // student_number and enrollment_date need to come from the nested join.
  // We use a regular (left) join rather than `students!inner` so a profile
  // missing its students row still shows up (see fix 7d7cb8e).
  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, city, country, status, created_at, students(id, student_number, enrollment_date)",
    )
    .eq("role", "student")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: rows } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Students</h1>
          <p className="text-muted-foreground">
            All approved student records.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/students/new">+ New student</Link>
        </Button>
      </div>

      <form className="max-w-md">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by name or email…"
        />
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Student #</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rows ?? []).length === 0 ? (
            <TableEmpty colSpan={6}>
              {q ? "No students match your search." : "No students yet."}
            </TableEmpty>
          ) : (
            (rows ?? []).map((row: any) => {
              const student = Array.isArray(row.students)
                ? row.students[0]
                : row.students;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      href={`/admin/students/${student?.id ?? row.id}`}
                      className="font-medium text-brand-goldlight hover:underline"
                    >
                      {row.full_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.email}
                  </TableCell>
                  <TableCell>{student?.student_number ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[row.city, row.country].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        row.status === "approved"
                          ? "success"
                          : row.status === "rejected"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(row.created_at)}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
