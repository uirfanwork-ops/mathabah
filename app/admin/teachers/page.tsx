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

export const metadata = { title: "Teachers" };

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();
  const q = (searchParams.q ?? "").trim().toLowerCase();

  const { data: allRows } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, status, created_at, display_id, teachers(id, employee_number, specialization, hire_date)",
    )
    .eq("role", "teacher")
    .order("created_at", { ascending: false });

  const rows = (allRows ?? []).filter((row: any) => {
    if (!q) return true;
    const teacher = Array.isArray(row.teachers)
      ? row.teachers[0]
      : row.teachers;
    const searchable = [
      row.full_name,
      row.email,
      row.phone,
      row.display_id,
      teacher?.employee_number,
      teacher?.specialization,
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
          <h1 className="text-3xl font-semibold">Teachers</h1>
          <p className="text-muted-foreground">
            Faculty members at Mathabah Institute.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/teachers/new">+ New teacher</Link>
        </Button>
      </div>

      <form className="max-w-md">
        <Input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search by name, email, employee #, specialization…"
        />
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Employee #</TableHead>
            <TableHead>Specialization</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmpty colSpan={7}>
              {q ? "No teachers match your search." : "No teachers yet."}
            </TableEmpty>
          ) : (
            rows.map((row: any) => {
              const teacher = Array.isArray(row.teachers)
                ? row.teachers[0]
                : row.teachers;
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs text-brand-gold">
                    {row.display_id ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/teachers/${teacher?.id ?? row.id}`}
                      className="font-medium text-brand-goldlight hover:underline"
                    >
                      {row.full_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.email}
                  </TableCell>
                  <TableCell className="text-brand-ink">
                    {teacher?.employee_number ?? "—"}
                  </TableCell>
                  <TableCell className="text-brand-ink">
                    {teacher?.specialization ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === "approved" ? "success" : "warning"}
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
