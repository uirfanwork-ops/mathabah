"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardList,
  FilePlus,
  Home,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/teacher", label: "Overview", icon: Home, exact: true },
  { href: "/teacher/my-courses", label: "My Courses", icon: BookOpen },
  { href: "/teacher/students", label: "Students", icon: Users },
  { href: "/teacher/reports", label: "Reports", icon: ClipboardList },
  { href: "/teacher/reports/new", label: "Submit report", icon: FilePlus },
];

export function TeacherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="portal-nav hidden w-60 shrink-0 border-r border-black bg-black lg:block">
      <nav className="sticky top-0 flex h-screen flex-col gap-1 p-4">
        <p className="mb-2 px-3 text-[10px] uppercase tracking-[0.2em] text-neutral-400">
          Teacher Portal
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white/15 text-white"
                  : "text-neutral-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
