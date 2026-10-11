"use client";

import { useState, useTransition } from "react";

import { adminUpdateUser } from "@/lib/admin/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface UserEditFormProps {
  user: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    role: string;
    status: string;
  };
  isSelf: boolean;
}

export function UserEditForm({ user, isSelf }: UserEditFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          try {
            await adminUpdateUser(formData);
            setMessage({ ok: true, text: "Saved. The user has been notified." });
          } catch (e) {
            setMessage({
              ok: false,
              text: e instanceof Error ? e.message : "Failed to save.",
            });
          }
        });
      }}
      className="space-y-4"
    >
      <input type="hidden" name="profile_id" value={user.id} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            required
            defaultValue={user.full_name}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user.email} disabled readOnly />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <Select
            id="role"
            name="role"
            defaultValue={user.role}
            disabled={isSelf}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher / Faculty</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Account status</Label>
          <Select
            id="status"
            name="status"
            defaultValue={user.status}
            disabled={isSelf}
          >
            <option value="pending">Pending approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
        {isSelf && (
          <>
            <input type="hidden" name="role" value={user.role} />
            <input type="hidden" name="status" value={user.status} />
            <p className="text-xs text-muted-foreground md:col-span-2">
              This is your own account — role and status are locked so you
              can&apos;t lock yourself out. Another admin can change them.
            </p>
          </>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={user.phone ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <Input id="address" name="address" defaultValue={user.address ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" defaultValue={user.city ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <Input id="country" name="country" defaultValue={user.country ?? ""} />
        </div>
      </div>

      {message && (
        <Alert variant={message.ok ? "success" : "destructive"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
