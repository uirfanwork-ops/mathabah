import { FIELD_LABELS } from "@/lib/auth/registration";
import type { Registration } from "@/lib/admin/registrations";
import { Badge } from "@/components/ui/badge";

/** "Registered as Teacher" badge + the answers they gave at sign-up. */
export function RegistrationSummary({ reg }: { reg?: Registration }) {
  if (!reg?.requestedRole) {
    return (
      <p className="text-xs text-muted-foreground">
        Registered before role selection existed — confirm their role below.
      </p>
    );
  }
  const entries = Object.entries(reg.details).filter(
    ([k, v]) => v && k !== "phone",
  );
  return (
    <div className="space-y-2">
      <Badge variant={reg.requestedRole === "teacher" ? "warning" : "outline"}>
        Registered as {reg.requestedRole}
      </Badge>
      {entries.length > 0 && (
        <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
          {entries.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-muted-foreground">{FIELD_LABELS[k] ?? k}</dt>
              <dd className="break-words text-brand-ink">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
