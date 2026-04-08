import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
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

export const metadata = { title: "Payments · Student" };

export default async function StudentPaymentsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!student) redirect("/dashboard");

  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount, currency, payment_date, method, reference, notes")
    .eq("student_id", student.id)
    .order("payment_date", { ascending: false });

  const rows = payments ?? [];

  // Totals by currency (in case multiple)
  const totals = new Map<string, number>();
  for (const p of rows) {
    totals.set(
      p.currency,
      (totals.get(p.currency) ?? 0) + Number(p.amount ?? 0),
    );
  }

  const primaryCurrency = rows[0]?.currency ?? "USD";
  const primaryTotal = totals.get(primaryCurrency) ?? 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = rows.filter(
    (p) => new Date(p.payment_date) >= monthStart,
  );
  const thisMonthTotal = thisMonth.reduce(
    (s, p) => s + Number(p.amount ?? 0),
    0,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-brand-parchment">
          Payments
        </h1>
        <p className="text-muted-foreground">
          Your payment history. Contact admin if anything looks wrong.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total paid"
          value={formatCurrency(primaryTotal, primaryCurrency)}
          hint={`${rows.length} payment${rows.length === 1 ? "" : "s"}`}
        />
        <StatCard
          label="This month"
          value={formatCurrency(thisMonthTotal, primaryCurrency)}
          hint={`${thisMonth.length} payment${thisMonth.length === 1 ? "" : "s"}`}
          accent="emerald"
        />
        <StatCard
          label="Latest"
          value={
            rows[0] ? formatDate(rows[0].payment_date) : "—"
          }
          hint={rows[0]?.reference ?? "No payments yet"}
          accent="red"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={6}>
                  No payments on file yet.
                </TableEmpty>
              ) : (
                rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDate(p.payment_date)}
                    </TableCell>
                    <TableCell className="font-medium text-brand-goldlight">
                      {formatCurrency(Number(p.amount), p.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{p.method.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.reference ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-md text-muted-foreground">
                      {p.notes ?? "—"}
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
