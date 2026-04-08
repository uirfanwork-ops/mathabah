import {
  BookOpen,
  GraduationCap,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Students"
          value={totalStudents ?? 0}
          hint="approved"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Teachers"
          value={totalTeachers ?? 0}
          hint="approved"
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          label="Courses"
          value={totalCourses ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Pending Approvals"
          value={pendingApprovals ?? 0}
          accent="red"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Revenue This Month"
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
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-brand-gold/10 bg-brand-ink/30 p-3"
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
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <AnnouncementsFeed />
      </div>
    </div>
  );
}
