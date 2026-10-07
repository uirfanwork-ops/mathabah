import Link from "next/link";

import { ResendConfirmationButton } from "@/components/auth/ResendConfirmationButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Confirm your email" };

export default function CheckEmailPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = (searchParams.email ?? "").trim();

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Check your email</CardTitle>
        <CardDescription>
          Step 1 of 2 — confirm your email address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border border-brand-gold/20 bg-card/40 p-4 text-sm leading-relaxed text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="text-brand-goldlight">
            {email || "your email address"}
          </span>
          . Click it to verify your address. Your registration then goes to the
          administration for approval (step 2), and you will be emailed when
          you are approved.
        </div>
        <div className="flex flex-col gap-2">
          <ResendConfirmationButton email={email} />
          <Button asChild variant="ghost">
            <Link href="/auth/login">Back to sign in</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
