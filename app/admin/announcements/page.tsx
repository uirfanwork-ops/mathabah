import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createAnnouncement,
  deleteAnnouncement,
} from "@/lib/announcements/actions";
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
          Broadcast messages to admins, teachers or students. Publishing writes
          an in-app notification for every recipient and sends a Resend email.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
          <CardDescription>
            Pick an audience and the message fans out to every approved user
            in that group.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createAnnouncement} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_200px]">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g. Ramadan schedule change"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience">Audience</Label>
                <Select id="audience" name="audience" defaultValue="all">
                  <option value="all">Everyone</option>
                  <option value="admins">Admins only</option>
                  <option value="teachers">Teachers only</option>
                  <option value="students">Students only</option>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body</Label>
              <Textarea
                id="body"
                name="body"
                rows={5}
                placeholder="Write the announcement body. Supports plain text."
                required
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Publish announcement</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(announcements ?? []).length === 0 ? (
                <TableEmpty colSpan={4}>No announcements yet.</TableEmpty>
              ) : (
                (announcements ?? []).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-muted-foreground">
                      {formatDate(a.published_at)}
                    </TableCell>
                    <TableCell>
                      <div className="text-brand-goldlight">{a.title}</div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">
                        {a.body}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.audience}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={deleteAnnouncement}>
                        <input type="hidden" name="id" value={a.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          className="text-red-300 hover:text-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
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
