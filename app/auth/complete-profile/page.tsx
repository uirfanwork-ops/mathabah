import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

import { CompleteProfileForm } from "./complete-profile-form";

export const metadata = { title: "Complete your profile" };

export default async function CompleteProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, address, city, country, status, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/auth/login");

  // If they already have everything, fall through to their dashboard.
  if (profile.phone && profile.address) {
    redirect("/dashboard");
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Complete your profile</CardTitle>
        <CardDescription>
          Before you continue we need a phone number and address on file.
          You&apos;ll be able to update these later from Settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CompleteProfileForm
          profile={{
            full_name: profile.full_name,
            phone: profile.phone,
            address: profile.address,
            city: profile.city,
            country: profile.country,
          }}
        />
      </CardContent>
    </Card>
  );
}
