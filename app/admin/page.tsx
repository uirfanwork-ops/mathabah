import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Shield,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { PendingQuickList } from "@/components/admin/PendingQuickList";
import { AnnouncementsFeed } from "@/components/shared/AnnouncementsFeed";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Admin Overview" };

export default async function AdminOverviewPage() {
  const supabase = createClient();

  // Stats — run in parallel
  const [
    { count: totalStudents },
    { count: totalTeachers },
    { count: totalCourses },
    { count: pendingApprovals },
    { data: revenueRows },
    { data: latestRegistrations },
    { count: totalAdmins },
    { data: pendingList },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .eq("status", "approved"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "teacher")
      .eq("status", "approved"),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("payments")
      .select("amount, payment_date")
      .gte(
        "payment_date",
        new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          .toISOString()
          .slice(0, 10),
      ),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "approved"),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5),
  ]);

  const monthRevenue = (revenueRows ?? []).reduce(
    (sum, r: { amount: number | string }) => sum + Number(r.amount ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          Welcome back
        </h1>
        <p className="text-muted-foreground">
          A snapshot of Mathabah Institute today.
        </p>
      </div>

      <PendingQuickList pending={pendingList ?? []} total={pendingApprovals ?? 0} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Students"
          href="/admin/students"
          value={totalStudents ?? 0}
          hint="approved"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Teachers"
          href="/admin/teachers"
          value={totalTeachers ?? 0}
          hint="approved"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          label="Admins"
          href="/admin/admins"
          value={totalAdmins ?? 0}
          hint="approved"
          icon={<Shield className="h-5 w-5" />}
        />
        <StatCard
          label="Courses"
          href="/admin/courses"
          value={totalCourses ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Pending Approvals"
          href="/admin/approvals"
          value={pendingApprovals ?? 0}
          accent="red"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Revenue This Month"
          href="/admin/payments"
          value={formatCurrency(monthRevenue)}
          accent="emerald"
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest registrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(latestRegistrations ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No registrations yet.
              </p>
            ) : (
              (latestRegistrations ?? []).map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/users/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-brand-gold/10 bg-brand-ink/30 p-3 transition hover:border-brand-gold/50"
                >
                  <div>
                    <div className="font-medium text-brand-goldlight">
                      {p.full_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.email} • {formatDate(p.created_at)}
                    </div>
                  </div>
                  <Badge
                    variant={
                      p.status === "approved"
                        ? "success"
                        : p.status === "rejected"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {p.status}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <AnnouncementsFeed />
      </div>
    </div>
  );
}
