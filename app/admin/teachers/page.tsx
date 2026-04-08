import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
  const q = (searchParams.q ?? "").trim();

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, status, created_at, teachers!inner(id, employee_number, specialization, hire_date)",
    )
    .eq("role", "teacher")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: rows } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-brand-parchment">
          Teachers
        </h1>
        <p className="text-muted-foreground">
          Faculty members at Mathabah Institute.
        </p>
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
            <TableHead>Employee #</TableHead>
            <TableHead>Specialization</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rows ?? []).length === 0 ? (
            <TableEmpty colSpan={6}>
              {q ? "No teachers match your search." : "No teachers yet."}
            </TableEmpty>
          ) : (
            (rows ?? []).map((row: any) => {
              const teacher = Array.isArray(row.teachers)
                ? row.teachers[0]
                : row.teachers;
              return (
                <TableRow key={row.id}>
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
                  <TableCell>{teacher?.employee_number ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
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
