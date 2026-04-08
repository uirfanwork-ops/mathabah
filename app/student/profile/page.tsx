import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/components/student/ProfileForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Profile · Student" };

export default async function StudentProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, address, city, country")
    .eq("id", user.id)
    .single();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, student_number, date_of_birth, gender, guardian_name, guardian_phone, guardian_email, emergency_contact, enrollment_date",
    )
    .eq("profile_id", user.id)
    .single();

  if (!profile || !student) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-brand-parchment">
          Profile
        </h1>
        <p className="text-muted-foreground">
          Keep your contact and guardian information up to date.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Read-only information managed by admin.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <ReadOnly label="Email" value={profile.email} />
          <ReadOnly label="Student number" value={student.student_number} />
          <ReadOnly
            label="Enrolled since"
            value={
              student.enrollment_date
                ? new Date(student.enrollment_date).toLocaleDateString()
                : null
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
          <CardDescription>
            Changes save immediately. Your teacher and admin will see updated
            contact info.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} student={student} />
        </CardContent>
      </Card>
    </div>
  );
}

function ReadOnly({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-brand-goldlight">{value || "—"}</p>
    </div>
  );
}
