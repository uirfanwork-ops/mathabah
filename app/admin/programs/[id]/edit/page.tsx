import Link from "next/link";
import { notFound } from "next/navigation";

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
import { deleteProgram, updateProgram } from "@/lib/admin/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit program" };

export default async function EditProgramPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("id, name, code, description, duration_months")
    .eq("id", params.id)
    .single();

  if (!program) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/programs"
        className="text-sm text-muted-foreground hover:text-brand-goldlight"
      >
        ← Back to programs
      </Link>

      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          Edit program
        </h1>
        <p className="text-muted-foreground">{program.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Program details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateProgram} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="id" value={program.id} />
            <div className="space-y-2">
              <Label htmlFor="name">Program name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={program.name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                name="code"
                defaultValue={program.code ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_months">Duration (months)</Label>
              <Input
                id="duration_months"
                name="duration_months"
                type="number"
                min={1}
                defaultValue={program.duration_months ?? ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={program.description ?? ""}
              />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Button type="submit" variant="secondary">
                Save changes
              </Button>
              <Button asChild variant="ghost">
                <Link href="/admin/programs">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={deleteProgram}>
            <input type="hidden" name="id" value={program.id} />
            <Button type="submit" variant="destructive" size="sm">
              Delete program
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
