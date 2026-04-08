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

export const metadata = { title: "Admins" };

interface SearchParams {
  q?: string;
}

export default async function AdminsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const q = (searchParams.q ?? "").trim();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, status, created_at")
    .eq("role", "admin")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: rows } = await query;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Admins</h1>
          <p className="text-muted-foreground">
            Users with full administrator access.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/admins/new">+ New admin</Link>
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
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rows ?? []).length === 0 ? (
            <TableEmpty colSpan={5}>
              {q ? "No admins match your search." : "No admins yet."}
            </TableEmpty>
          ) : (
            (rows ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.full_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.email}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.phone ?? "—"}
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
