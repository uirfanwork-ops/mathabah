import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { onEmailConfirmed } from "@/lib/auth/email-confirmation";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles the confirmation link emailed at registration. Verifies the token
 * (marking the email confirmed), signs the user in, tells the admin a new
 * account is ready for review, then sends the user to the holding screen.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") ?? "signup") as EmailOtpType;

  if (tokenHash) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error && data.user) {
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/auth/reset-password", request.url));
      }
      await onEmailConfirmed(data.user.id);
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  const url = new URL("/auth/login", request.url);
  url.searchParams.set("error", "confirm_failed");
  return NextResponse.redirect(url);
}
