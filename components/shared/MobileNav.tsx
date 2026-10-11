"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Home, Menu, ShieldCheck, Users, X, GraduationCap } from "lucide-react";

import { NAV } from "@/components/shared/AdminSidebar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "admin-menu:open";

/** Header button — always visible on phones/tablets, labelled so it's findable. */
export function MobileMenuTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="flex items-center gap-1.5 rounded-md border border-white/40 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10 lg:hidden"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
      Menu
    </button>
  );
}

/** Bottom tab bar + slide-in drawer with every admin page. Hidden on desktop. */
export function MobileNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const tabs = [
    { href: "/admin", label: "Home", icon: Home, exact: true },
    { href: "/admin/approvals", label: "Approvals", icon: ShieldCheck, badge: pendingCount },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/teachers", label: "Teachers", icon: GraduationCap },
  ];

  return (
    <div className="lg:hidden">
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-black bg-black pb-[env(safe-area-inset-bottom)]"
        aria-label="Admin quick navigation"
      >
        {tabs.map(({ href, label, icon: Icon, exact, badge }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              isActive(href, exact) ? "text-white" : "text-neutral-400",
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
            {badge ? (
              <span className="absolute right-[22%] top-1 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                {badge}
              </span>
            ) : null}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-neutral-400"
        >
          <Menu className="h-5 w-5" />
          More
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="relative ml-auto flex h-full w-[82%] max-w-xs flex-col bg-black p-4 text-white shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                Administration
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {NAV.map(({ href, label, icon: Icon, exact }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium",
                    isActive(href, exact)
                      ? "bg-white/15 text-white"
                      : "text-neutral-300 hover:bg-white/10",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {href === "/admin/approvals" && pendingCount ? (
                    <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold">
                      {pendingCount}
                    </span>
                  ) : null}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              disabled={signingOut}
              onClick={() =>
                startSignOut(async () => {
                  await createClient().auth.signOut();
                  router.replace("/auth/login");
                  router.refresh();
                })
              }
              className="mt-3 rounded-md border border-white/30 px-3 py-3 text-base font-medium hover:bg-white/10"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
