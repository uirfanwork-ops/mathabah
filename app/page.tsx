import Link from "next/link";

import { BrandMark } from "@/components/shared/BrandMark";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <header className="container flex items-center justify-between py-6">
        <BrandMark />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/auth/register">Register</Link>
          </Button>
        </nav>
      </header>

      <section className="container flex flex-col items-center justify-center gap-8 py-24 text-center">
        <span className="rounded-full border border-brand-gold/30 bg-brand-gold/5 px-4 py-1 text-xs uppercase tracking-[0.25em] text-brand-gold">
          Student Management
        </span>
        <h1 className="max-w-3xl text-5xl font-semibold text-brand-parchment md:text-6xl">
          Mathabah Learning Centre{" "}
          <span className="gold-text">Student Portal</span>
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Admissions, enrolments, grading and reporting — built for our admins,
          teachers and students.
        </p>
        <div className="gold-divider max-w-xs" />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/auth/register">Create an account</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/auth/login">Sign in to dashboard</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
