import { Megaphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

/**
 * Reusable announcements widget for role overview pages. RLS filters
 * announcements by audience so every role only sees what's meant for them.
 */
export async function AnnouncementsFeed({ limit = 5 }: { limit?: number }) {
  const supabase = createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, audience, published_at")
    .order("published_at", { ascending: false })
    .limit(limit);

  const rows = announcements ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-brand-gold" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No announcements right now.
          </p>
        ) : (
          rows.map((a) => (
            <div
              key={a.id}
              className="rounded-md border border-brand-gold/15 bg-brand-ink/30 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-brand-goldlight">
                  {a.title}
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {a.audience}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                {a.body}
              </p>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                {formatDate(a.published_at)}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
