import Link from "next/link";

import { PaymentForm } from "@/components/admin/PaymentForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const supabase = createClient();

  const [{ data: payments }, { data: students }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, amount, currency, payment_date, method, reference, student:students(id, student_number, profiles(full_name))",
      )
      .order("payment_date", { ascending: false })
      .limit(100),
    supabase
      .from("students")
      .select("id, student_number, profiles!inner(full_name)")
      .order("created_at", { ascending: false }),
  ]);

  const studentOptions = (students ?? []).map((s: any) => ({
    id: s.id,
    student_number: s.student_number,
    full_name: Array.isArray(s.profiles)
      ? s.profiles[0]?.full_name
      : s.profiles?.full_name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          Payments
        </h1>
        <p className="text-muted-foreground">
          Record student payments and view recent history.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record a payment</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentForm students={studentOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments ?? []).length === 0 ? (
                <TableEmpty colSpan={6}>No payments recorded yet.</TableEmpty>
              ) : (
                (payments ?? []).map((p: any) => {
                  const student = Array.isArray(p.student)
                    ? p.student[0]
                    : p.student;
                  const profile = Array.isArray(student?.profiles)
                    ? student?.profiles[0]
                    : student?.profiles;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.payment_date)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/students/${student?.id}`}
                          className="text-brand-goldlight hover:underline"
                        >
                          {profile?.full_name ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium text-brand-ink">
                        {formatCurrency(Number(p.amount), p.currency)}
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {p.method?.replace("_", " ")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.reference ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <a
                          href={`/api/pdf/payment-receipt/${p.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-goldlight hover:underline"
                        >
                          PDF →
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
