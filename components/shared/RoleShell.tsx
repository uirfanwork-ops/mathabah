import Link from "next/link";

import { BrandMark } from "@/components/shared/BrandMark";
import { SignOutLink } from "@/components/shared/SignOutLink";
import { cn } from "@/lib/utils";

interface RoleShellProps {
  role: "admin" | "teacher" | "student";
  email: string;
  fullName: string;
  children: React.ReactNode;
}

export function RoleShell({ role, email, fullName, children }: RoleShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-brand-gold/20 bg-brand-ink/80 backdrop-blur">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard">
              <BrandMark />
            </Link>
            <span
              className={cn(
                "rounded-full border px-3 py-0.5 text-[10px] uppercase tracking-[0.2em]",
                role === "admin" && "border-brand-red/50 text-brand-red",
                role === "teacher" && "border-brand-gold/50 text-brand-gold",
                role === "student" && "border-emerald-500/50 text-emerald-300",
              )}
            >
              {role}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right text-xs text-muted-foreground sm:block">
              <div className="text-brand-goldlight">{fullName}</div>
              <div>{email}</div>
            </div>
            <SignOutLink />
          </div>
        </div>
      </header>
      <main className="container flex-1 py-10">{children}</main>
    </div>
  );
}
