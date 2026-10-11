import Link from "next/link";
import { notFound } from "next/navigation";

import { UserEditForm } from "@/components/admin/UserEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, getInitials } from "@/lib/utils";

export const metadata = { title: "Edit account" };

export default async function AdminUserPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, address, city, country, role, status, created_at, display_id",
    )
    .eq("id", params.id)
    .maybeSingle();
  if (!profile) notFound();

  // Link to the role-specific record (courses, grades, payments, …) if any.
  let detailHref: string | null = null;
  let detailLabel = "";
  if (profile.role === "student") {
    const { data } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (data) {
      detailHref = `/admin/students/${data.id}`;
      detailLabel = "Courses, grades & payments";
    }
  } else if (profile.role === "teacher") {
    const { data } = await supabase
      .from("teachers")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (data) {
      detailHref = `/admin/teachers/${data.id}`;
      detailLabel = "Courses & reports";
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin"
        className="text-sm text-muted-foreground hover:text-brand-goldlight"
      >
        ← Back to overview
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-brand-gold/40 bg-brand-gold/10 text-xl text-brand-gold">
            {getInitials(profile.full_name)}
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{profile.full_name}</h1>
            <p className="text-sm text-muted-foreground">
              {profile.display_id ? `${profile.display_id} · ` : ""}
              {profile.email} · joined {formatDate(profile.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{profile.role}</Badge>
          <Badge
            variant={
              profile.status === "approved"
                ? "success"
                : profile.status === "pending"
                  ? "warning"
                  : "destructive"
            }
          >
            {profile.status}
          </Badge>
        </div>
      </div>

      {detailHref && (
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={detailHref}>{detailLabel} →</Link>
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Account, role &amp; status</CardTitle>
        </CardHeader>
        <CardContent>
          <UserEditForm user={profile} isSelf={profile.id === me?.id} />
        </CardContent>
      </Card>
    </div>
  );
}
