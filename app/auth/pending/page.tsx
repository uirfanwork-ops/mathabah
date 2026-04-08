import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Pending approval" };

export default async function PendingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If approved already, fall straight through to the dashboard.
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.status === "approved") {
      redirect("/dashboard");
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-brand-gold/40 bg-brand-gold/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 text-brand-gold"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>
        <CardTitle>Awaiting approval</CardTitle>
        <CardDescription>
          Thank you for registering with Mathabah Institute.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border border-brand-gold/20 bg-card/40 p-4 text-sm leading-relaxed text-muted-foreground">
          Your account is being reviewed by an administrator. You will receive
          an email at{" "}
          <span className="text-brand-goldlight">
            {user?.email ?? "your registered address"}
          </span>{" "}
          as soon as it has been approved.
        </div>
        <div className="flex flex-col gap-2">
          <SignOutButton />
          <Button asChild variant="ghost">
            <Link href="/">Return to home</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
