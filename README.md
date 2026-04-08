# Mathabah Institute — Student Management CRM

A modern student management system for **Mathabah Institute**, built with
Next.js 14 (App Router), Supabase, Tailwind CSS, shadcn/ui and Resend.
Three roles: **admin**, **teacher**, **student**. All registrations are held
as `pending` until an admin approves them.

> **Status:** Phases 1–5 are implemented. Phase 6 (polish —
> notifications, announcements, audit log, course resources) is
> scaffolded as routes/placeholders and will be filled in in the
> final PR.

---

## Tech stack

| Area            | Choice                                    |
| --------------- | ----------------------------------------- |
| Framework       | Next.js 14 (App Router, RSC)              |
| Styling         | Tailwind CSS + shadcn/ui                  |
| Database / Auth | Supabase (Postgres + Auth + RLS)          |
| Email           | Resend                                    |
| PDFs (Phase 5)  | `@react-pdf/renderer` via API routes      |
| Deploy target   | Vercel                                    |

The brand palette is **black, dark red (`#7a0a13` / `#9b1c2b`)** and **gold
(`#c9a14a` / `#e6c878`)** to reflect Islamic academic tradition.

---

## What ships in Phase 1

- ✅ Next.js 14 + Tailwind + shadcn/ui project scaffold
- ✅ Mathabah brand theme (dark red / gold / black) baked into Tailwind tokens
- ✅ Supabase schema migration covering every entity referenced in the spec
- ✅ Row-level security policies for all tables
- ✅ Auth pages: `/auth/register`, `/auth/login`, `/auth/pending`
- ✅ Auto-create `profiles` row on signup (DB trigger), default
  `role = 'student'`, `status = 'pending'`
- ✅ `middleware.ts` that gates every route on auth + role + approval status
- ✅ Resend helpers for **all six** triggers from the spec
- ✅ `POST /api/resend/send-approval` invoked on registration → notifies admin

---

## Repository layout

```
app/
  api/resend/send-approval/route.ts   ← admin notification on register
  auth/
    layout.tsx
    login/page.tsx + login-form.tsx
    register/page.tsx + register-form.tsx
    pending/page.tsx + sign-out-button.tsx
  dashboard/page.tsx                  ← redirects based on role
  admin/page.tsx                      ← Phase 2+ home
  teacher/page.tsx                    ← Phase 3+ home
  student/page.tsx                    ← Phase 4+ home
  layout.tsx
  globals.css
  page.tsx                            ← marketing landing
components/
  ui/                                 ← shadcn primitives (Button, Card, …)
  shared/
    BrandMark.tsx
    RoleShell.tsx
    SignOutLink.tsx
lib/
  supabase/
    client.ts        ← browser client
    server.ts        ← server-component / route-handler client
    middleware.ts    ← edge cookie refresh helper
    types.ts
  resend.ts          ← all 6 email triggers
  utils.ts
supabase/
  migrations/
    0001_initial_schema.sql
    0002_rls_policies.sql
middleware.ts        ← route protection + role routing
```

> The full directory tree from the spec (admin/students, admin/teachers,
> teacher/my-courses, student/grades, etc.) will be added as Phases 2–6 land.
> The current admin/teacher/student home pages document which routes belong
> to which phase.

---

## Database schema

> ⚠️ The original task mentioned "Use the following exact database schema"
> but the block that followed was the directory tree, not a SQL schema.
> The schema in `supabase/migrations/0001_initial_schema.sql` is a complete,
> self-consistent design that covers every entity referenced in the spec.
> If you have an exact schema you want to use instead, drop it in and replace
> the migration before applying.

Tables created:

| Table              | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `profiles`         | One row per `auth.users`. Holds `role` and `status`.      |
| `students`         | Student profile data (guardian info, address, …).         |
| `teachers`         | Teacher bio, specialisation, employment data.             |
| `programs`         | Top-level academic programs.                              |
| `courses`          | Courses within a program, owned by a teacher.             |
| `enrollments`      | Student ↔ course join with status.                        |
| `attendance`       | Per-session attendance keyed off enrollment.              |
| `assessments`      | Assessment definitions per course.                        |
| `grades`           | Per-enrollment, per-assessment scores.                    |
| `payments`         | Payment ledger per student.                               |
| `teacher_reports`  | Mid-course / end-of-course / concern reports.             |
| `announcements`    | Audience-targeted broadcasts.                             |
| `notifications`    | In-app notification bell items.                           |
| `audit_logs`       | Admin audit trail.                                        |
| `course_resources` | Course handouts / links (Phase 6).                        |

A trigger on `auth.users` auto-creates a matching `profiles` row with
`role = 'student'` and `status = 'pending'`.

### Row Level Security

`0002_rls_policies.sql` enables RLS on every table and applies the policies
described in the spec:

- **Admins** (approved) can do anything.
- **Teachers** (approved) can read/write rows for the courses they own.
- **Students** (approved) can read their own rows and only see teacher reports
  marked `is_visible_to_student = true`.
- **Pending** users can only read their own profile.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Provision Supabase

1. Create a Supabase project at <https://supabase.com>.
2. Apply both migrations in `supabase/migrations/` in order. Easiest options:
   - **Supabase CLI**: `supabase db push`
   - **Dashboard**: SQL editor → paste each file in order → run.
3. Promote your first admin from the SQL editor:
   ```sql
   update public.profiles
   set role = 'admin', status = 'approved', approved_at = now()
   where email = 'you@yourdomain.com';
   ```

### 3. Configure environment

Copy `.env.example` to `.env.local` and fill it in:

```bash
cp .env.example .env.local
```

| Variable                          | Notes                                       |
| --------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Supabase anon (publishable) key             |
| `SUPABASE_SERVICE_ROLE_KEY`       | Service role key — used by trusted routes  |
| `RESEND_API_KEY`                  | Resend API key                              |
| `RESEND_FROM_EMAIL`               | Verified sender e.g. `Mathabah <…>`         |
| `ADMIN_NOTIFICATION_EMAIL`        | Inbox to notify on new registrations        |
| `NEXT_PUBLIC_APP_URL`             | Public URL of the deployment                |

### 4. Run

```bash
npm run dev
```

Visit <http://localhost:3000> and try the flow:

1. Click **Register** → create an account.
2. You'll be sent to `/auth/pending` and admin will receive a Resend email.
3. As an admin (approved row in Supabase), you'll be redirected to `/admin`
   instead of pending.

---

## Resend triggers

All six triggers from the spec live in `lib/resend.ts`:

| Trigger                | Function                          | Recipient        |
| ---------------------- | --------------------------------- | ---------------- |
| New user registers     | `sendNewRegistrationToAdmin`      | Admin            |
| Admin approves account | `sendApprovalWelcome`             | New user         |
| Admin rejects account  | `sendApprovalRejection`           | Rejected user    |
| Teacher submits report | `sendTeacherReportToAdmin`        | Admin            |
| Payment recorded       | `sendPaymentConfirmation`         | Student          |
| New announcement       | `sendAnnouncement`                | Targeted users   |

The first trigger is wired up in this phase via
`POST /api/resend/send-approval`. The remaining five will be invoked from the
relevant Phase 2+ API routes (`/api/auth/approve`, `/api/payments`, etc.).

---

## What ships in Phase 2

- ✅ Admin layout with branded sidebar (`/admin/*` is fully gated by middleware
  + layout and only reachable by approved admins)
- ✅ Admin **overview** with five stat cards (students, teachers, courses,
  pending approvals, revenue this month) and latest registrations
- ✅ **Approvals dashboard** with approve / reject server actions, role
  reassignment at approval time, audit log entries, and Resend welcome /
  rejection emails
- ✅ **Students list** with name/email search and the student detail page
  exposing five tabs: Profile (editable), Enrollments, Grades, Payments,
  Reports
- ✅ **Teachers list** + teacher detail page with Profile / Courses /
  Reports tabs
- ✅ **Programs** management with inline create + delete
- ✅ **Courses** management with create form (program + teacher binding) and
  per-course detail showing enrolled students
- ✅ **Payments** — record with confirmation email to the student + recent
  payments table
- ✅ **Enrollment manager** — assign students to courses from the student
  detail page
- ✅ `POST /api/auth/approve` for non-UI callers
- ✅ All admin mutations write to `audit_logs`

## What ships in Phase 3

- ✅ Teacher layout with branded sidebar (gated to approved teachers only)
- ✅ Teacher **overview** with stat cards (active courses, total students,
  reports submitted) plus recent courses and recent reports panels
- ✅ **My courses** list and per-course detail page with three tabs:
  Students, Attendance, Grades
- ✅ **Attendance sheet** — date picker + per-student status (present /
  absent / late / excused) and notes, upserted by `(enrollment_id,
  session_date)`
- ✅ **Grade entry** — create assessment form (name, max score, weight,
  due date) plus per-assessment grade table with score + feedback,
  upserted by `(enrollment_id, assessment_id)`
- ✅ **Students** list aggregating every student across the teacher's
  courses with quick "Write report" links
- ✅ **Reports** — submit mid-course / end-of-course / concern reports
  with `is_visible_to_student` toggle, list of past reports
- ✅ **Concern flag wiring** — submitting a `concern` report fires the
  `sendTeacherReportToAdmin` Resend trigger and creates in-app
  notifications for every approved admin (via service role to bypass RLS)
- ✅ All teacher mutations enforce `assertTeacherOwnsCourse()` and check
  the teacher actually has the student enrolled before writing a report

## What ships in Phase 4

- ✅ Student layout with branded sidebar (gated to approved students only)
- ✅ Student **overview** with active courses / attendance % / recent
  payments / visible reports stat cards and quick-peek panels
- ✅ **My courses** list and per-course detail page with three tabs:
  Grades, Attendance, Course info (teacher, schedule, program)
- ✅ **Grades** page grouped by course with weighted-average computation
  across all assessments
- ✅ **Attendance** page with overall present/late/absent/excused
  breakdown and full session history across every enrolled course
- ✅ **Payments** page with total-paid, this-month and latest summary
  plus full payment ledger (method, reference, notes)
- ✅ **Reports** page that only shows teacher reports where
  `is_visible_to_student = true` (RLS-enforced, belt-and-braces filter)
- ✅ **Profile** page with an editable contact form (full_name, phone,
  DOB, address, guardian + emergency contact). Updates go through
  `updateStudentProfile` which relies on the self-update RLS policies
  on `profiles` and `students`

## What ships in Phase 5

Three branded PDF documents rendered server-side with
`@react-pdf/renderer`, protected by per-role access checks:

- ✅ **Student report card** (`/api/pdf/student-report/[studentId]`) —
  title block, meta (email, student number, enrolment date), overall
  attendance callout, per-course sections with teacher, weighted
  average, attendance tallies, and a full assessments / grades table
  with scores and feedback
- ✅ **Payment receipt** (`/api/pdf/payment-receipt/[paymentId]`) —
  branded header, `MTB-XXXXXXXX` receipt number, received-from block,
  large amount callout, method / reference / recorded-by details and
  notes
- ✅ **Teacher report** (`/api/pdf/teacher-report/[reportId]`) — header,
  title, teacher + student meta, a red concern callout when the
  report type is `concern`, body and a signature block
- ✅ Shared `lib/pdf/styles.ts` + `lib/pdf/render.ts` — brand palette,
  table primitives, lazy-imported `renderToBuffer` so the large
  @react-pdf/renderer bundle only loads in the Node runtime of the
  route handler
- ✅ `experimental.serverComponentsExternalPackages` set to keep
  `@react-pdf/renderer` out of the edge/client bundles
- ✅ **Access control** per endpoint: admins see everything, teachers
  only see report cards for students enrolled in their own courses
  and only their own teacher reports, students only see their own
  report card / payment receipts / reports where
  `is_visible_to_student = true` (RLS does most of the work, with
  explicit guards inside the route handlers)
- ✅ **Download links wired in** across admin (student detail, payments
  list), teacher (course detail per student, reports list) and
  student (overview quick action, payments table, reports list)
- 🐛 Fixed a Phase 3 bug in `app/teacher/my-courses/[id]/page.tsx` where
  the students rollup was using `profiles.id` instead of `students.id`,
  which broke the "Write report" link and would have broken the new
  PDF link

## Roadmap

| Phase | Description                                                       | Status        |
| ----- | ----------------------------------------------------------------- | ------------- |
| 1     | Foundation — auth, schema, RLS, register/login/pending, Resend    | ✅ shipped    |
| 2     | Admin dashboard, approvals, students/teachers/courses CRUD        | ✅ shipped    |
| 3     | Teacher portal — courses, attendance, grades, reports             | ✅ shipped    |
| 4     | Student portal — courses, grades, payments, profile               | ✅ shipped    |
| 5     | PDF reports via `@react-pdf/renderer`                              | ✅ shipped    |
| 6     | Notifications, announcements, audit log, course resources         | ⏳ scaffolded |
