import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/shared/BrandMark";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { SignOutLink } from "@/components/shared/SignOutLink";
import { StudentSidebar } from "@/components/shared/StudentSidebar";
import { createClient } from "@/lib/supabase/server";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "student" || profile.status !== "approved") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-brand-gold/20 bg-brand-ink/80 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-6">
            <Link href="/student">
              <BrandMark />
            </Link>
            <span className="rounded-full border border-brand-gold/50 px-3 py-0.5 text-[10px] uppercase tracking-[0.2em] text-brand-gold">
              Student
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs sm:block">
              <div className="text-brand-goldlight">{profile.full_name}</div>
              <div className="text-muted-foreground">{profile.email}</div>
            </div>
            <NotificationBell href="/student/notifications" />
            <SignOutLink />
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <StudentSidebar />
        <main className="flex-1 px-6 py-10 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
