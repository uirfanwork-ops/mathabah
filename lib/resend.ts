import { Resend } from "resend";

/**
 * Mathabah Institute — transactional email helpers.
 *
 * All triggers documented in the spec live here. API routes call these
 * functions; never call resend.emails.send directly outside this file.
 */

const apiKey = process.env.RESEND_API_KEY;
const fromAddress =
  process.env.RESEND_FROM_EMAIL ?? "Mathabah Institute <noreply@mathabah.example>";
const adminEmail =
  process.env.ADMIN_NOTIFICATION_EMAIL ?? "admin@mathabah.example";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getClient(): Resend | null {
  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY is not set — emails are no-ops.");
    return null;
  }
  return new Resend(apiKey);
}

function wrap(title: string, body: string) {
  return `<!doctype html>
<html>
  <body style="font-family: ui-sans-serif, system-ui, sans-serif; background: #0a0a0a; color: #f5ecd6; padding: 32px;">
    <table align="center" width="560" cellpadding="0" cellspacing="0" style="background: #141414; border: 1px solid #c9a14a33; border-radius: 12px; padding: 32px;">
      <tr>
        <td>
          <h1 style="font-family: Georgia, serif; color: #c9a14a; margin: 0 0 16px 0;">Mathabah Institute</h1>
          <h2 style="color: #e6c878; font-size: 18px; margin: 0 0 16px 0;">${title}</h2>
          <div style="color: #f5ecd6; line-height: 1.6;">${body}</div>
          <hr style="border: 0; border-top: 1px solid #c9a14a33; margin: 24px 0;">
          <p style="color: #888; font-size: 12px; margin: 0;">
            You're receiving this email from Mathabah Institute student management system.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. New user registers → notify admin
// ─────────────────────────────────────────────────────────────────────────────
export async function sendNewRegistrationToAdmin(params: {
  fullName: string;
  email: string;
  requestedRole?: string;
}) {
  const client = getClient();
  if (!client) return { skipped: true };

  return client.emails.send({
    from: fromAddress,
    to: adminEmail,
    subject: "New account pending approval",
    html: wrap(
      "New account pending approval",
      `<p>A new user has registered and is awaiting approval.</p>
       <p>
         <strong>Name:</strong> ${escapeHtml(params.fullName)}<br>
         <strong>Email:</strong> ${escapeHtml(params.email)}<br>
         <strong>Requested role:</strong> ${escapeHtml(params.requestedRole ?? "student")}
       </p>
       <p>
         <a href="${appUrl}/admin/approvals" style="display:inline-block;background:#7a0a13;color:#f5ecd6;padding:10px 18px;border-radius:6px;text-decoration:none;border:1px solid #c9a14a;">
           Open approvals dashboard
         </a>
       </p>`,
    ),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Admin approves account → welcome email
// ─────────────────────────────────────────────────────────────────────────────
export async function sendApprovalWelcome(params: {
  to: string;
  fullName: string;
  role: string;
}) {
  const client = getClient();
  if (!client) return { skipped: true };

  return client.emails.send({
    from: fromAddress,
    to: params.to,
    subject: "Welcome to Mathabah Institute",
    html: wrap(
      `Welcome, ${escapeHtml(params.fullName)}`,
      `<p>Your Mathabah Institute account has been approved.</p>
       <p>You can now sign in as a <strong>${escapeHtml(params.role)}</strong> and access your dashboard.</p>
       <p>
         <a href="${appUrl}/auth/login" style="display:inline-block;background:#7a0a13;color:#f5ecd6;padding:10px 18px;border-radius:6px;text-decoration:none;border:1px solid #c9a14a;">
           Sign in
         </a>
       </p>`,
    ),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Admin rejects account → rejection email
// ─────────────────────────────────────────────────────────────────────────────
export async function sendApprovalRejection(params: {
  to: string;
  fullName: string;
  reason?: string;
}) {
  const client = getClient();
  if (!client) return { skipped: true };

  return client.emails.send({
    from: fromAddress,
    to: params.to,
    subject: "Account registration update",
    html: wrap(
      "Account registration update",
      `<p>Dear ${escapeHtml(params.fullName)},</p>
       <p>Thank you for your interest in Mathabah Institute. After review, we are unable to approve your account at this time.</p>
       ${params.reason ? `<p><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>` : ""}
       <p>If you believe this is an error, please contact the administration office.</p>`,
    ),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Teacher submits report → notify admin
// ─────────────────────────────────────────────────────────────────────────────
export async function sendTeacherReportToAdmin(params: {
  teacherName: string;
  studentName: string;
  reportType: string;
  reportId: string;
}) {
  const client = getClient();
  if (!client) return { skipped: true };

  return client.emails.send({
    from: fromAddress,
    to: adminEmail,
    subject: "New student report submitted",
    html: wrap(
      "New student report submitted",
      `<p><strong>${escapeHtml(params.teacherName)}</strong> just submitted a
        <strong>${escapeHtml(params.reportType)}</strong> report for
        <strong>${escapeHtml(params.studentName)}</strong>.</p>
       <p>
         <a href="${appUrl}/admin/reports" style="display:inline-block;background:#7a0a13;color:#f5ecd6;padding:10px 18px;border-radius:6px;text-decoration:none;border:1px solid #c9a14a;">
           View report
         </a>
       </p>`,
    ),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Payment recorded → confirmation to student
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPaymentConfirmation(params: {
  to: string;
  fullName: string;
  amount: string;
  reference?: string;
  date: string;
}) {
  const client = getClient();
  if (!client) return { skipped: true };

  return client.emails.send({
    from: fromAddress,
    to: params.to,
    subject: "Payment confirmation",
    html: wrap(
      "Payment received — thank you",
      `<p>Dear ${escapeHtml(params.fullName)},</p>
       <p>We have recorded your payment to Mathabah Institute.</p>
       <p>
         <strong>Amount:</strong> ${escapeHtml(params.amount)}<br>
         <strong>Date:</strong> ${escapeHtml(params.date)}<br>
         ${params.reference ? `<strong>Reference:</strong> ${escapeHtml(params.reference)}` : ""}
       </p>
       <p>You can view your full payment history in the student portal.</p>`,
    ),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. New announcement → broadcast to audience
// ─────────────────────────────────────────────────────────────────────────────
export async function sendAnnouncement(params: {
  to: string[];
  title: string;
  body: string;
}) {
  const client = getClient();
  if (!client) return { skipped: true };
  if (params.to.length === 0) return { skipped: true };

  return client.emails.send({
    from: fromAddress,
    to: params.to,
    subject: `Announcement from Mathabah — ${params.title}`,
    html: wrap(params.title, `<div>${params.body}</div>`),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
