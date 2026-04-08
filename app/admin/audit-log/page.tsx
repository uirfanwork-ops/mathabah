import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
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

export const metadata = { title: "Audit Log" };

const ENTITY_TYPES = [
  "profile",
  "student",
  "teacher",
  "program",
  "course",
  "enrollment",
  "payment",
  "announcement",
  "report",
  "resource",
];

const PAGE_SIZE = 100;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { entity?: string; action?: string; q?: string };
}) {
  const supabase = createClient();
  const entity = searchParams.entity ?? "";
  const action = searchParams.action ?? "";
  const q = (searchParams.q ?? "").trim();

  let query = supabase
    .from("audit_logs")
    .select(
      "id, action, entity_type, entity_id, metadata, created_at, actor:profiles!actor_id(full_name, email, role)",
    )
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  if (entity) query = query.eq("entity_type", entity);
  if (action) query = query.ilike("action", `%${action}%`);
  if (q) query = query.ilike("action", `%${q}%`);

  const { data: logs } = await query;
  const rows = logs ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-brand-parchment">
            Audit log
          </h1>
          <p className="text-muted-foreground">
            Every admin mutation — approvals, payments, enrollments,
            announcements, deletions — is recorded here. Showing the latest{" "}
            {PAGE_SIZE}.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="entity">Entity type</Label>
              <Select id="entity" name="entity" defaultValue={entity}>
                <option value="">All entities</option>
                {ENTITY_TYPES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="q">Action contains</Label>
              <Input
                id="q"
                name="q"
                placeholder="e.g. approve, delete, record"
                defaultValue={q}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" variant="outline">
                Apply
              </Button>
              <Button asChild variant="ghost">
                <Link href="/admin/audit-log">Reset</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5}>No matching audit events.</TableEmpty>
              ) : (
                rows.map((r) => {
                  const actor = Array.isArray((r as any).actor)
                    ? (r as any).actor[0]
                    : (r as any).actor;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(r.created_at)}
                      </TableCell>
                      <TableCell>
                        {actor ? (
                          <div>
                            <div className="text-brand-goldlight">
                              {actor.full_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {actor.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">system</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {r.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-brand-goldlight">
                          {r.entity_type}
                        </div>
                        {r.entity_id ? (
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {r.entity_id.slice(0, 8)}…
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-md">
                        {r.metadata ? (
                          <code className="text-[10px] text-muted-foreground">
                            {JSON.stringify(r.metadata)}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
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
