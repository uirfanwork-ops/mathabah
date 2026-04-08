import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/shared/AdminSidebar";
import { BrandMark } from "@/components/shared/BrandMark";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { SignOutLink } from "@/components/shared/SignOutLink";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
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

  if (!profile || profile.role !== "admin" || profile.status !== "approved") {
    redirect("/dashboard");
  }

  const { count: pendingCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-black bg-black">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin">
              <BrandMark />
            </Link>
            <span className="rounded-full border border-white/30 px-3 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs sm:block">
              <div className="text-white">{profile.full_name}</div>
              <div className="text-neutral-400">{profile.email}</div>
            </div>
            <NotificationBell href="/admin/notifications" />
            <SignOutLink />
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <AdminSidebar pendingCount={pendingCount ?? 0} />
        <main className="portal-main flex-1 px-6 py-10 lg:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
