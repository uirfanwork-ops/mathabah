import Link from "next/link";

import { ResendForm } from "./resend-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Resend confirmation email" };

export default function ResendConfirmationPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Didn&apos;t get your confirmation email?</CardTitle>
        <CardDescription>
          Enter the email you registered with and we&apos;ll send a fresh
          confirmation link. No password needed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResendForm defaultEmail={searchParams.email ?? ""} />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-brand-gold hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
