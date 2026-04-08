import { NextResponse } from "next/server";
import { createElement } from "react";

import {
  PaymentReceiptPDF,
  type PaymentReceiptData,
} from "@/components/pdf/PaymentReceiptPDF";
import { pdfResponse, renderPdfToBuffer } from "@/lib/pdf/render";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/pdf/payment-receipt/[id] — payment id from public.payments
// Access:
//   * admins: any payment
//   * students: only their own payments (RLS also enforces)
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("id, role, status")
    .eq("id", user.id)
    .single();
  if (!me || me.status !== "approved") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // RLS restricts non-admin to their own payments already.
  const { data: payment, error } = await supabase
    .from("payments")
    .select(
      "id, amount, currency, payment_date, method, reference, notes, recorded_by, student_id, students!inner(id, student_number, profile_id, profiles!inner(full_name, email))",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error || !payment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // PostgREST's generated types for complex !inner joins collapse into a
  // union that includes GenericStringError, so we relax the type locally
  // after the null check.
  const p = payment as any;

  const studentRel = Array.isArray(p.students) ? p.students[0] : p.students;
  const studentProfile = Array.isArray(studentRel?.profiles)
    ? studentRel?.profiles[0]
    : studentRel?.profiles;

  // Belt-and-braces: make sure a student can only see their own receipt.
  if (me.role === "student" && studentRel?.profile_id !== me.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Look up the admin who recorded the payment. Use the service-role client
  // because the student can't read arbitrary profiles.
  let recordedByName: string | null = null;
  if (p.recorded_by) {
    try {
      const svc = createServiceRoleClient();
      const { data: actor } = await svc
        .from("profiles")
        .select("full_name")
        .eq("id", p.recorded_by)
        .maybeSingle();
      recordedByName = actor?.full_name ?? null;
    } catch {
      recordedByName = null;
    }
  }

  const data: PaymentReceiptData = {
    generatedAt: new Date().toISOString(),
    receiptNumber: `MTB-${String(p.id).slice(0, 8).toUpperCase()}`,
    payment: {
      amount: Number(p.amount),
      currency: p.currency,
      paymentDate: p.payment_date,
      method: p.method,
      reference: p.reference ?? null,
      notes: p.notes ?? null,
    },
    student: {
      fullName: studentProfile?.full_name ?? "Unknown student",
      email: studentProfile?.email ?? "",
      studentNumber: studentRel?.student_number ?? null,
    },
    recordedBy: { fullName: recordedByName },
  };

  const buf = await renderPdfToBuffer(
    createElement(PaymentReceiptPDF, { data }),
  );
  return pdfResponse(buf, `mathabah-receipt-${data.receiptNumber}.pdf`);
}
