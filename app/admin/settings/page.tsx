import { redirect } from "next/navigation";

import { SettingsForm } from "@/components/shared/SettingsForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone, address, city, country")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/auth/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Update your contact details or change your password.
        </p>
      </div>
      <SettingsForm profile={profile} />
    </div>
  );
}
