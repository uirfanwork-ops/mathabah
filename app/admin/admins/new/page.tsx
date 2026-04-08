import Link from "next/link";

import { CreateUserForm } from "@/components/admin/CreateUserForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "New admin" };

export default function NewAdminPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/admin/admins"
        className="text-sm text-muted-foreground hover:text-brand-goldlight"
      >
        ← Back to admins
      </Link>

      <div>
        <h1 className="text-3xl font-semibold">Add a new admin</h1>
        <p className="text-muted-foreground">
          Grant full administrator access. The new admin will be able to
          manage students, teachers, payments, and other admins.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admin details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateUserForm role="admin" />
        </CardContent>
      </Card>
    </div>
  );
}
