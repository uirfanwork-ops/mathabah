import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { RoleShell } from "@/components/shared/RoleShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Admin" };

export default async function AdminHomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  return (
    <RoleShell
      role="admin"
      fullName={profile?.full_name ?? ""}
      email={profile?.email ?? user.email ?? ""}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-brand-parchment">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Stats, approvals and management — coming in Phase 2.
          </p>
        </div>
        <div className="gold-divider" />
        <Card>
          <CardHeader>
            <CardTitle>Phase 1 complete</CardTitle>
            <CardDescription>
              Auth, RLS, registration approval flow and admin notification email
              are wired up. Phase 2 will land the stats overview, approvals
              dashboard, and student / teacher / course management here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Routes scaffolded for Phase 2: <code>/admin/students</code>,{" "}
            <code>/admin/teachers</code>, <code>/admin/courses</code>,{" "}
            <code>/admin/programs</code>, <code>/admin/payments</code>,{" "}
            <code>/admin/reports</code>, <code>/admin/approvals</code>,{" "}
            <code>/admin/announcements</code>.
          </CardContent>
        </Card>
      </div>
    </RoleShell>
  );
}
