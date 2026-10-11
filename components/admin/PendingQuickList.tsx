import Link from "next/link";

import { approveAccount, rejectAccount } from "@/lib/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

interface PendingProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

/** Compact approve/reject rows for the dashboard — thumb-friendly on mobile. */
export function PendingQuickList({
  pending,
  total,
}: {
  pending: PendingProfile[];
  total: number;
}) {
  if (pending.length === 0) return null;

  return (
    <section className="rounded-lg border-2 border-brand-red/50 bg-brand-red/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Awaiting your approval{" "}
          <Badge variant="warning" className="ml-1 align-middle">
            {total}
          </Badge>
        </h2>
        {total > pending.length && (
          <Link
            href="/admin/approvals"
            className="text-sm text-brand-gold hover:underline"
          >
            See all →
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {pending.map((p) => (
          <form
            key={p.id}
            className="space-y-3 rounded-md border border-brand-gold/20 bg-white p-3"
          >
            <input type="hidden" name="profile_id" value={p.id} />
            <div>
              <Link
                href={`/admin/users/${p.id}`}
                className="font-medium text-brand-ink hover:underline"
              >
                {p.full_name}
              </Link>
              <div className="break-all text-xs text-muted-foreground">
                {p.email} · registered {formatDate(p.created_at)}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <Select name="role" defaultValue={p.role} aria-label="Approve as">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </Select>
              <Button type="submit" formAction={approveAccount} size="sm">
                Approve
              </Button>
              <Button
                type="submit"
                formAction={rejectAccount}
                size="sm"
                variant="destructive"
              >
                Reject
              </Button>
            </div>
          </form>
        ))}
      </div>
    </section>
  );
}
