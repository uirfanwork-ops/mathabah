import Link from "next/link";

import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "New student" };

export default function NewStudentPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/students"
        className="text-sm text-muted-foreground hover:text-brand-goldlight"
      >
        ← Back to students
      </Link>

      <div>
        <h1 className="text-3xl font-semibold">Add a new student</h1>
        <p className="text-muted-foreground">
          Create a student account with login credentials. The user can sign
          in immediately.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm role="student" />
        </CardContent>
      </Card>
    </div>
  );
}
