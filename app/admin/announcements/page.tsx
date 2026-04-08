import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const supabase = createClient();
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id, title, body, audience, published_at")
    .order("published_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-brand-parchment">
          Announcements
        </h1>
        <p className="text-muted-foreground">
          Broadcast messages to admins, teachers or students.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
          <CardDescription>
            Audience-targeted publishing form lands in Phase 6 along with the
            in-app notifications bell.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Resend broadcast via <code>sendAnnouncement()</code> in{" "}
          <code>lib/resend.ts</code>.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Audience</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(announcements ?? []).length === 0 ? (
                <TableEmpty colSpan={3}>No announcements yet.</TableEmpty>
              ) : (
                (announcements ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(a.published_at)}
                    </TableCell>
                    <TableCell className="text-brand-goldlight">
                      {a.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.audience}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
