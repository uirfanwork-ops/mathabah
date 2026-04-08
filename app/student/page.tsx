import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileDown,
  Wallet,
} from "lucide-react";

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
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Student" };

export default async function StudentOverviewPage() {
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

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!student) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student record missing</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Your student record is not provisioned. Ask an admin to re-run the
          approval flow for your account.
        </CardContent>
      </Card>
    );
  }

  const [
    { data: enrollments },
    { data: recentReports },
    { data: recentPayments },
    { data: recentAttendance },
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "id, status, courses(id, name, code, schedule, is_active)",
      )
      .eq("student_id", student.id)
      .order("enrolled_at", { ascending: false }),
    supabase
      .from("teacher_reports")
      .select("id, title, type, created_at")
      .eq("student_id", student.id)
      .eq("is_visible_to_student", true)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("payments")
      .select("id, amount, currency, payment_date, reference")
      .eq("student_id", student.id)
      .order("payment_date", { ascending: false })
      .limit(5),
    supabase
      .from("attendance")
      .select("id, status, enrollments!inner(student_id)")
      .eq("enrollments.student_id", student.id),
  ]);

  const activeCourses = (enrollments ?? []).filter(
    (e) => e.status === "active",
  );
  const totalPaid = (recentPayments ?? []).reduce(
    (sum, p) => sum + Number(p.amount ?? 0),
    0,
  );
  const attendanceRows = (recentAttendance ?? []) as { status: string }[];
  const presentCount = attendanceRows.filter(
    (a) => a.status === "present" || a.status === "late",
  ).length;
  const attendancePct =
    attendanceRows.length > 0
      ? Math.round((presentCount / attendanceRows.length) * 100)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          As-salāmu ʿalaykum, {profile?.full_name?.split(" ")[0] ?? "student"}
        </h1>
        <p className="text-muted-foreground">
          Your courses, grades, payments and reports.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Courses"
          value={activeCourses.length}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Attendance"
          value={attendancePct === null ? "—" : `${attendancePct}%`}
          hint={
            attendanceRows.length
              ? `${presentCount}/${attendanceRows.length} sessions`
              : "No sessions yet"
          }
          accent="emerald"
          icon={<CalendarCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Recent Payments"
          value={formatCurrency(totalPaid)}
          hint={`${(recentPayments ?? []).length} most recent`}
          icon={<Wallet className="h-5 w-5" />}
        />
        <a
          href={`/api/pdf/student-report/${student.id}`}
          target="_blank"
          rel="noreferrer"
          className="group relative overflow-hidden rounded-lg border border-brand-gold/40 bg-brand-gold/10 p-5 text-left shadow-lg shadow-black/30 transition-colors hover:bg-brand-gold/20"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-brand-gold/80">
                Quick action
              </p>
              <p className="mt-2 text-lg text-brand-goldlight">
                Download report card
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {(recentReports ?? []).length} visible report
                {(recentReports ?? []).length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-brand-gold/40 bg-brand-gold/15 text-brand-gold">
              <FileDown className="h-5 w-5" />
            </div>
          </div>
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your courses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You aren&apos;t enrolled in any courses yet.
              </p>
            ) : (
              activeCourses.map((e) => {
                const c = Array.isArray((e as any).courses)
                  ? (e as any).courses[0]
                  : (e as any).courses;
                if (!c) return null;
                return (
                  <Link
                    key={e.id}
                    href={`/student/my-courses/${c.id}`}
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
                    <Badge variant="success">active</Badge>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(recentReports ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No reports shared with you yet.
              </p>
            ) : (
              (recentReports ?? []).map((r) => (
                <Link
                  key={r.id}
                  href="/student/reports"
                  className="flex items-center justify-between rounded-md border border-brand-gold/15 bg-brand-ink/30 p-3 hover:bg-brand-gold/5"
                >
                  <div>
                    <div className="font-medium text-brand-goldlight">
                      {r.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(r.created_at)}
                    </div>
                  </div>
                  <Badge variant="outline">{r.type.replace("_", " ")}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AnnouncementsFeed />
    </div>
  );
}
