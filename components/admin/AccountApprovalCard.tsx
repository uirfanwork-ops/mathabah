import { approveAccount, rejectAccount } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDate, getInitials } from "@/lib/utils";

interface AccountApprovalCardProps {
  profile: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
  };
}

export function AccountApprovalCard({ profile }: AccountApprovalCardProps) {
  return (
    <div className="rounded-lg border border-brand-gold/20 bg-card/70 p-5 shadow-md shadow-black/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-gold/40 bg-brand-gold/10 text-lg text-brand-gold">
            {getInitials(profile.full_name)}
          </div>
          <div>
            <div className="text-base font-medium text-brand-parchment">
              {profile.full_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {profile.email}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              Registered {formatDate(profile.created_at)}
            </div>
          </div>
        </div>
        <Badge variant="warning">pending</Badge>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Approve */}
        <form action={approveAccount} className="space-y-2">
          <input type="hidden" name="profile_id" value={profile.id} />
          <label className="text-xs uppercase tracking-wider text-brand-gold/70">
            Approve as
          </label>
          <Select name="role" defaultValue={profile.role}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </Select>
          <Button type="submit" variant="secondary" className="w-full">
            Approve
          </Button>
        </form>

        {/* Reject */}
        <form action={rejectAccount} className="space-y-2">
          <input type="hidden" name="profile_id" value={profile.id} />
          <label className="text-xs uppercase tracking-wider text-brand-gold/70">
            Reason (optional)
          </label>
          <Textarea name="reason" rows={2} placeholder="Optional message…" />
          <Button type="submit" variant="destructive" className="w-full">
            Reject
          </Button>
        </form>
      </div>
    </div>
  );
}
