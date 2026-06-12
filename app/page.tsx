import Link from "next/link";
import { BookOpen, GraduationCap, Shield, Users } from "lucide-react";

import { BrandMark } from "@/components/shared/BrandMark";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-brand-black">
      {/* ── Atmospheric background layers ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial glows */}
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-brand-crimson/15 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-brand-gold/10 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-brand-gold/5 blur-[80px]" />

        {/* Geometric grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(201,161,74,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(201,161,74,1) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Diagonal accent lines */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 80px,
                rgba(201,161,74,0.3) 80px,
                rgba(201,161,74,0.3) 81px
              )
            `,
          }}
        />

        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-black/60 via-transparent to-brand-black/90" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 container flex items-center justify-between py-6">
        <BrandMark />
        <nav className="flex items-center gap-3">
          <Button asChild variant="ghost" className="text-brand-parchment/80 hover:text-brand-parchment">
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/auth/register">Register</Link>
          </Button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 container flex flex-col items-center justify-center gap-6 pb-8 pt-16 text-center md:pt-24">
        <span className="animate-fade-up rounded-full border border-brand-gold/30 bg-brand-gold/5 px-5 py-1.5 text-[11px] font-medium uppercase tracking-[0.3em] text-brand-gold">
          Student Management System
        </span>

        <h1 className="max-w-4xl animate-fade-up text-5xl font-bold leading-[1.1] text-brand-parchment opacity-0 [animation-delay:150ms] md:text-7xl">
          Mathabah Learning{" "}
          <br className="hidden sm:block" />
          Centre{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-brand-gold via-brand-goldlight to-brand-gold bg-clip-text text-transparent">
              Student Portal
            </span>
            <span className="absolute -bottom-2 left-0 h-px w-full bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent" />
          </span>
        </h1>

        <p className="max-w-2xl animate-fade-up text-lg leading-relaxed text-brand-parchment/60 opacity-0 [animation-delay:300ms] md:text-xl">
          Admissions, enrolments, grading and reporting — a unified platform
          for our admins, teachers and students.
        </p>
      </section>

      {/* ── Role cards ── */}
      <section className="relative z-10 container pb-24 pt-12">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          <RoleCard
            href="/auth/register"
            icon={<GraduationCap className="h-8 w-8" />}
            title="Students"
            description="Register for courses, track your grades, view attendance and access course materials."
            accent="gold"
            delay={0}
          />
          <RoleCard
            href="/auth/login"
            icon={<Users className="h-8 w-8" />}
            title="Teachers"
            description="Manage your courses, record attendance, grade assessments and submit student reports."
            accent="crimson"
            delay={1}
          />
          <RoleCard
            href="/auth/login"
            icon={<Shield className="h-8 w-8" />}
            title="Admins"
            description="Full control over programs, courses, students, teachers, payments and system settings."
            accent="gold"
            delay={2}
          />
        </div>
      </section>

      {/* ── Features strip ── */}
      <section className="relative z-10 border-t border-brand-gold/10">
        <div className="container py-16">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-4">
            <FeaturePill icon={<BookOpen className="h-5 w-5" />} label="Course Management" />
            <FeaturePill icon={<GraduationCap className="h-5 w-5" />} label="Grade Tracking" />
            <FeaturePill icon={<Users className="h-5 w-5" />} label="Attendance Records" />
            <FeaturePill icon={<Shield className="h-5 w-5" />} label="Secure & Private" />
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-brand-gold/10 py-8 text-center text-xs text-brand-parchment/30">
        <div className="container">
          &copy; {new Date().getFullYear()} Mathabah Learning Centre. All
          rights reserved.
        </div>
      </footer>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function RoleCard({
  href,
  icon,
  title,
  description,
  accent,
  delay,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: "gold" | "crimson";
  delay: number;
}) {
  const borderColor =
    accent === "gold" ? "border-brand-gold/20" : "border-brand-crimson/20";
  const hoverBorder =
    accent === "gold"
      ? "group-hover:border-brand-gold/50"
      : "group-hover:border-brand-red/50";
  const iconColor =
    accent === "gold" ? "text-brand-gold" : "text-brand-red";
  const shimmerColor =
    accent === "gold"
      ? "from-transparent via-brand-gold/10 to-transparent"
      : "from-transparent via-brand-red/10 to-transparent";

  return (
    <Link
      href={href}
      className="group relative"
      style={{ animationDelay: `${400 + delay * 150}ms` }}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border ${borderColor} ${hoverBorder} bg-brand-ink/60 p-8 backdrop-blur-sm transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:shadow-brand-gold/5`}
      >
        {/* Shimmer overlay */}
        <div
          className={`pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r ${shimmerColor} opacity-0 transition-opacity duration-300 group-hover:animate-shimmer group-hover:opacity-100`}
        />

        {/* Corner glow */}
        <div
          className={`absolute -right-8 -top-8 h-24 w-24 rounded-full ${
            accent === "gold" ? "bg-brand-gold/5" : "bg-brand-red/5"
          } blur-2xl transition-all duration-500 group-hover:scale-150 ${
            accent === "gold" ? "group-hover:bg-brand-gold/10" : "group-hover:bg-brand-red/10"
          }`}
        />

        <div className="relative z-10">
          <div
            className={`mb-4 inline-flex rounded-xl border ${
              accent === "gold"
                ? "border-brand-gold/20 bg-brand-gold/5"
                : "border-brand-red/20 bg-brand-red/5"
            } p-3 ${iconColor} transition-transform duration-300 group-hover:scale-110`}
          >
            {icon}
          </div>
          <h3 className="mb-2 text-xl font-semibold text-brand-parchment">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-brand-parchment/50">
            {description}
          </p>
          <div
            className={`mt-5 inline-flex items-center gap-1.5 text-sm font-medium ${iconColor} transition-all duration-300 group-hover:gap-2.5`}
          >
            Get started
            <span className="transition-transform duration-300 group-hover:translate-x-1">
              &rarr;
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function FeaturePill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 text-brand-parchment/40">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-gold/10 bg-brand-gold/5 text-brand-gold/60">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
