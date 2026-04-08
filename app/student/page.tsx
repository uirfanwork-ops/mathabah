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

export const metadata = { title: "Student" };

export default async function StudentHomePage() {
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
      role="student"
      fullName={profile?.full_name ?? ""}
      email={profile?.email ?? user.email ?? ""}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-brand-parchment">
            As-salāmu ʿalaykum, {profile?.full_name?.split(" ")[0] ?? "student"}
          </h1>
          <p className="text-muted-foreground">
            Your courses, grades and payments — coming in Phase 4.
          </p>
        </div>
        <div className="gold-divider" />
        <Card>
          <CardHeader>
            <CardTitle>Your account is approved</CardTitle>
            <CardDescription>
              Phase 4 will add your enrolled courses, recent grades, payment
              history and visible teacher reports here.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Routes scaffolded for Phase 4: <code>/student/my-courses</code>,{" "}
            <code>/student/grades</code>, <code>/student/payments</code>,{" "}
            <code>/student/profile</code>.
          </CardContent>
        </Card>
      </div>
    </RoleShell>
  );
}
