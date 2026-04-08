"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateOwnContact } from "@/lib/profile/actions";

interface Props {
  profile: {
    full_name: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
  };
}

export function CompleteProfileForm({ profile }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          try {
            await updateOwnContact(formData);
            router.replace("/dashboard");
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to save.");
          }
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={profile.full_name}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone <span className="text-red-600">*</span>
        </Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={profile.phone ?? ""}
          required
          placeholder="+1 555 555 5555"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">
          Street address <span className="text-red-600">*</span>
        </Label>
        <Textarea
          id="address"
          name="address"
          defaultValue={profile.address ?? ""}
          rows={2}
          required
          placeholder="123 Main St"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            defaultValue={profile.city ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            defaultValue={profile.country ?? ""}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving…" : "Continue"}
      </Button>
    </form>
  );
}
