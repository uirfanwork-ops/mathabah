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
  const q = (searchParams.q ?? "").trim().toLowerCase();

  const { data: allRows } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, status, created_at, display_id")
    .eq("role", "admin")
    .order("created_at", { ascending: false });

  const rows = (allRows ?? []).filter((row) => {
    if (!q) return true;
    const searchable = [row.full_name, row.email, row.phone, row.display_id]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(q);
  });

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
          placeholder="Search by name, email, phone, ID…"
        />
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rows ?? []).length === 0 ? (
            <TableEmpty colSpan={6}>
              {q ? "No admins match your search." : "No admins yet."}
            </TableEmpty>
          ) : (
            (rows ?? []).map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs text-brand-gold">
                  {row.display_id ?? "—"}
                </TableCell>
                <TableCell className="font-medium text-brand-ink">{row.full_name}</TableCell>
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
