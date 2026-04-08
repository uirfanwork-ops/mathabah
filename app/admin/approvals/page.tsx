import { AccountApprovalCard } from "@/components/admin/AccountApprovalCard";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const supabase = createClient();

  const { data: pending } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-brand-parchment">
          Account Approvals
        </h1>
        <p className="text-muted-foreground">
          Review pending registrations and assign their role.
        </p>
      </div>

      {(pending ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            <p className="text-base text-brand-goldlight">
              No accounts awaiting approval
            </p>
            <p className="mt-1">You&apos;re all caught up.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(pending ?? []).map((p) => (
            <AccountApprovalCard key={p.id} profile={p} />
          ))}
        </div>
      )}
    </div>
  );
}
