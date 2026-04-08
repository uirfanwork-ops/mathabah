import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, ClipboardList, FilePlus, Users } from "lucide-react";

import { AnnouncementsFeed } from "@/components/shared/AnnouncementsFeed";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Teacher" };

export default async function TeacherOverviewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!teacher) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teacher record missing</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your teacher record is not provisioned. Ask an admin to re-run the
          approval flow for your account.
        </CardContent>
      </Card>
    );
  }

  const [{ data: courses }, { count: studentCount }, { data: latestReports }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, name, code, schedule, is_active")
        .eq("teacher_id", teacher.id)
        .order("name"),
      supabase
        .from("enrollments")
        .select("id, courses!inner(teacher_id)", { count: "exact", head: true })
        .eq("courses.teacher_id", teacher.id),
      supabase
        .from("teacher_reports")
        .select("id, title, type, created_at, is_visible_to_student")
        .eq("teacher_id", teacher.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          As-salāmu ʿalaykum, {profile?.full_name?.split(" ")[0] ?? "teacher"}
        </h1>
        <p className="text-muted-foreground">
          Your courses, students and reports.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Courses"
          value={(courses ?? []).filter((c) => c.is_active).length}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Total Students"
          value={studentCount ?? 0}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Reports Submitted"
          value={(latestReports ?? []).length}
          accent="emerald"
          icon={<ClipboardList className="h-5 w-5" />}
        />
        <Link
          href="/teacher/reports/new"
          className="group relative overflow-hidden rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-5 text-left shadow-lg shadow-black/30 transition-colors hover:bg-brand-gold/20"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-gold/80">
                Quick action
              </p>
              <p className="mt-2 text-lg text-brand-goldlight">
                Submit a report
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                mid-course / end-of-course / concern
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-brand-gold/40 bg-brand-gold/15 text-brand-gold">
              <FilePlus className="h-5 w-5" />
            </div>
          </div>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(courses ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You aren&apos;t assigned to any courses yet. Ask an admin to
                assign you.
              </p>
            ) : (
              (courses ?? []).map((c) => (
                <Link
                  key={c.id}
                  href={`/teacher/my-courses/${c.id}`}
                  className="flex items-center justify-between rounded-md border border-brand-gold/15 bg-brand-ink/30 p-3 hover:bg-brand-gold/5"
                >
                  <div>
                    <div className="font-medium text-brand-goldlight">
                      {c.code ? `${c.code} — ` : ""}
                      {c.name}
                    </div>
                    {c.schedule && (
                      <div className="text-xs text-muted-foreground">
                        {c.schedule}
                      </div>
                    )}
                  </div>
                  <Badge variant={c.is_active ? "success" : "secondary"}>
                    {c.is_active ? "active" : "archived"}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(latestReports ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reports submitted yet.
              </p>
            ) : (
              (latestReports ?? []).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-md border border-brand-gold/15 bg-brand-ink/30 p-3"
                >
                  <div>
                    <div className="font-medium text-brand-goldlight">
                      {r.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(r.created_at)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{r.type}</Badge>
                    {r.is_visible_to_student && (
                      <Badge variant="success">visible</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AnnouncementsFeed />
    </div>
  );
}
