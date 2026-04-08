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

export const metadata = { title: "Teacher" };

export default async function TeacherHomePage() {
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
      role="teacher"
      fullName={profile?.full_name ?? ""}
      email={profile?.email ?? user.email ?? ""}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-brand-parchment">
            Teacher Portal
          </h1>
          <p className="text-muted-foreground">
            Your courses, students and reports — coming in Phase 3.
          </p>
        </div>
        <div className="gold-divider" />
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Phase 3 will add course rosters, attendance entry, grade entry,
              mid- and end-of-course reports, and student concern flags here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Routes scaffolded for Phase 3: <code>/teacher/my-courses</code>,{" "}
            <code>/teacher/students</code>, <code>/teacher/reports</code>.
          </CardContent>
        </Card>
      </div>
    </RoleShell>
  );
}
