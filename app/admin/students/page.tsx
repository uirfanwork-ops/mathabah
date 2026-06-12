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

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const q = (searchParams.q ?? "").trim().toLowerCase();

  const { data: allRows } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, city, country, status, created_at, display_id, students(id, student_number, enrollment_date)",
    )
    .eq("role", "student")
    .order("created_at", { ascending: false });

  const rows = (allRows ?? []).filter((row: any) => {
    if (!q) return true;
    const student = Array.isArray(row.students)
      ? row.students[0]
      : row.students;
    const searchable = [
      row.full_name,
      row.email,
      row.phone,
      row.display_id,
      row.city,
      row.country,
      student?.student_number,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(q);
  });

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
          defaultValue={searchParams.q ?? ""}
          placeholder="Search by name, email, student #, location…"
        />
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Student #</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={7}>
              {q ? "No students match your search." : "No students yet."}
            </TableEmpty>
          ) : (
            rows.map((row: any) => {
              const student = Array.isArray(row.students)
                ? row.students[0]
                : row.students;
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs text-brand-gold">
                    {row.display_id ?? "—"}
                  </TableCell>
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
                  <TableCell className="text-brand-ink">
                    {student?.student_number ?? "—"}
                  </TableCell>
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
