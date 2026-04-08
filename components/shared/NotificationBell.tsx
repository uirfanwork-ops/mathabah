import Link from "next/link";
import { Bell } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/**
 * Server component rendered inside every role layout. Reads the unread
 * notification count for the current user and links through to the
 * per-role `/notifications` page where the user can inspect + mark them read.
 */
export async function NotificationBell({ href }: { href: string }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  const unread = count ?? 0;
  const display = unread > 9 ? "9+" : String(unread);

  return (
    <Link
      href={href}
      aria-label={
        unread > 0 ? `Notifications (${unread} unread)` : "Notifications"
      }
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-gold/30 bg-brand-ink/40 text-brand-goldlight transition-colors hover:border-brand-gold/60 hover:bg-brand-gold/10"
    >
      <Bell className="h-4 w-4" />
      <span
        className={cn(
          "pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full border border-brand-ink bg-brand-red px-1 text-[9px] font-bold text-brand-parchment",
          unread === 0 && "hidden",
        )}
      >
        {display}
      </span>
    </Link>
  );
}
