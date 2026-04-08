import Link from "next/link";

import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "New teacher" };

export default function NewTeacherPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/teachers"
        className="text-sm text-muted-foreground hover:text-brand-goldlight"
      >
        ← Back to teachers
      </Link>

      <div>
        <h1 className="text-3xl font-semibold">Add a new teacher</h1>
        <p className="text-muted-foreground">
          Create a teacher account with login credentials. The user can sign
          in immediately.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teacher details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm role="teacher" />
        </CardContent>
      </Card>
    </div>
  );
}
