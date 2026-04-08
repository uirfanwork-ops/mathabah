"use client";

import { useState, useTransition } from "react";

import { recordPayment } from "@/lib/admin/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface PaymentFormProps {
  students: { id: string; full_name: string; student_number: string | null }[];
  defaultStudentId?: string;
}

export function PaymentForm({ students, defaultStudentId }: PaymentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          try {
            await recordPayment(formData);
            setMessage("Payment recorded.");
            (document.getElementById("payment-form") as HTMLFormElement)?.reset();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Failed");
          }
        });
      }}
      id="payment-form"
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="student_id">Student</Label>
        <Select
          id="student_id"
          name="student_id"
          required
          defaultValue={defaultStudentId ?? ""}
        >
          <option value="" disabled>
            Select a student…
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
              {s.student_number ? ` (#${s.student_number})` : ""}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">Currency</Label>
        <Select id="currency" name="currency" defaultValue="USD">
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="MYR">MYR</option>
          <option value="PKR">PKR</option>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="payment_date">Date</Label>
        <Input
          id="payment_date"
          name="payment_date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="method">Method</Label>
        <Select id="method" name="method" defaultValue="bank_transfer">
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="card">Card</option>
          <option value="cheque">Cheque</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="reference">Reference</Label>
        <Input id="reference" name="reference" placeholder="Invoice / receipt #" />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      {message && (
        <div className="md:col-span-2">
          <Alert
            variant={message === "Payment recorded." ? "success" : "destructive"}
          >
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        </div>
      )}
      <div className="md:col-span-2">
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "Recording…" : "Record payment"}
        </Button>
      </div>
    </form>
  );
}
