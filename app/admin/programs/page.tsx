import Link from "next/link";

import { createProgram, deleteProgram } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export const metadata = { title: "Programs" };

export default async function ProgramsPage() {
  const supabase = createClient();
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, code, description, duration_months, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          Programs
        </h1>
        <p className="text-muted-foreground">
          Top-level academic programs at Mathabah Institute.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a new program</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createProgram} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Program name</Label>
              <Input id="name" name="name" required placeholder="Diploma in Islamic Studies" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" name="code" placeholder="DIS" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_months">Duration (months)</Label>
              <Input id="duration_months" name="duration_months" type="number" min={1} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" variant="secondary">
                Create program
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All programs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-40"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(programs ?? []).length === 0 ? (
                <TableEmpty colSpan={5}>No programs yet.</TableEmpty>
              ) : (
                (programs ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-brand-gold">
                      {p.code ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium text-brand-goldlight">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.duration_months ? `${p.duration_months} months` : "—"}
                    </TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">
                      {p.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/admin/programs/${p.id}/edit`}>
                            Edit
                          </Link>
                        </Button>
                        <form action={deleteProgram}>
                          <input type="hidden" name="id" value={p.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
