import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate } from "@/lib/utils";

/**
 * Shared notifications inbox used by the /admin/notifications,
 * /teacher/notifications and /student/notifications pages. Reads the
 * current user's notifications, renders them, and exposes server-action
 * forms for marking read / marking all read.
 */
export async function NotificationsList() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = notifications ?? [];
  const unreadCount = rows.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-brand-parchment">
            Notifications
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} unread · ${rows.length} total`
              : `${rows.length} total`}
          </p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          </form>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 text-brand-gold/50" />
            No notifications yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-4 rounded-md border p-4 transition-colors",
                  n.is_read
                    ? "border-brand-gold/10 bg-brand-ink/20"
                    : "border-brand-gold/40 bg-brand-gold/5",
                )}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-brand-goldlight">
                      {n.title}
                    </span>
                    {!n.is_read && (
                      <Badge variant="warning" className="text-[10px]">
                        new
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {n.type}
                    </Badge>
                  </div>
                  {n.body ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {n.body}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-3 pt-1 text-xs">
                    <span className="text-muted-foreground">
                      {formatDate(n.created_at)}
                    </span>
                    {n.link ? (
                      <Link
                        href={n.link}
                        className="text-brand-goldlight hover:underline"
                      >
                        Open →
                      </Link>
                    ) : null}
                  </div>
                </div>
                {!n.is_read ? (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Mark read
                    </Button>
                  </form>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
