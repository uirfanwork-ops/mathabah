-- =============================================================================
-- Fix infinite RLS recursion: students ↔ enrollments
-- =============================================================================
-- PostgreSQL evaluates ALL permissive policies (OR'd together) for any query.
-- The students_teacher_read policy queries enrollments, and
-- enrollments_student_self queries students — creating a cycle.
--
-- Fix: a SECURITY DEFINER helper that resolves the current user's student.id
-- without triggering RLS on public.students, then rewrite every policy that
-- previously joined to public.students from another table to use it instead.
-- =============================================================================

-- Helper: returns the current user's students.id (bypasses RLS)
create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id from public.students s where s.profile_id = auth.uid() limit 1;
$$;

-- ── enrollments ─────────────────────────────────────────────────────────────
drop policy if exists enrollments_student_self on public.enrollments;
create policy enrollments_student_self on public.enrollments
  for select using (student_id = public.current_student_id());

-- ── attendance ──────────────────────────────────────────────────────────────
drop policy if exists attendance_student_read on public.attendance;
create policy attendance_student_read on public.attendance
  for select using (
    exists (
      select 1 from public.enrollments e
      where e.id = attendance.enrollment_id
        and e.student_id = public.current_student_id()
    )
  );

-- ── assessments ─────────────────────────────────────────────────────────────
drop policy if exists assessments_student_r on public.assessments;
create policy assessments_student_r on public.assessments
  for select using (
    exists (
      select 1 from public.enrollments e
      where e.course_id = assessments.course_id
        and e.student_id = public.current_student_id()
    )
  );

-- ── grades ──────────────────────────────────────────────────────────────────
drop policy if exists grades_student_read on public.grades;
create policy grades_student_read on public.grades
  for select using (
    exists (
      select 1 from public.enrollments e
      where e.id = grades.enrollment_id
        and e.student_id = public.current_student_id()
    )
  );

-- ── payments ────────────────────────────────────────────────────────────────
drop policy if exists payments_student_read on public.payments;
create policy payments_student_read on public.payments
  for select using (student_id = public.current_student_id());

-- ── teacher_reports ─────────────────────────────────────────────────────────
drop policy if exists reports_student_read on public.teacher_reports;
create policy reports_student_read on public.teacher_reports
  for select using (
    is_visible_to_student = true
    and student_id = public.current_student_id()
  );

-- ── course_resources ────────────────────────────────────────────────────────
drop policy if exists resources_student_read on public.course_resources;
create policy resources_student_read on public.course_resources
  for select using (
    exists (
      select 1 from public.enrollments e
      where e.course_id = course_resources.course_id
        and e.student_id = public.current_student_id()
    )
  );
