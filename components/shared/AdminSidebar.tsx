"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  FileClock,
  GraduationCap,
  Home,
  Layers,
  Megaphone,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: Home, exact: true },
  { href: "/admin/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  { href: "/admin/programs", label: "Programs", icon: Layers },
  { href: "/admin/courses", label: "Courses", icon: BookOpen },
  { href: "/admin/payments", label: "Payments", icon: Wallet },
  { href: "/admin/reports", label: "Reports", icon: ClipboardList },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/audit-log", label: "Audit Log", icon: FileClock },
];

export function AdminSidebar({ pendingCount }: { pendingCount?: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-brand-gold/15 bg-brand-ink/40 lg:block">
      <nav className="sticky top-0 flex h-screen flex-col gap-1 p-4">
        <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.2em] text-brand-gold/70">
          Administration
        </p>
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-gold/10 text-brand-goldlight"
                  : "text-muted-foreground hover:bg-brand-gold/5 hover:text-brand-goldlight",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {href === "/admin/approvals" && pendingCount ? (
                <span className="rounded-full bg-brand-red px-1.5 py-0.5 text-[10px] font-bold text-brand-parchment">
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
