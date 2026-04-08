-- =============================================================================
-- Mathabah Institute — Row Level Security policies
-- =============================================================================
-- Conventions:
--   * Admins can do anything within an approved status.
--   * Teachers can read their own teacher row and read students enrolled in
--     their courses; they can write attendance/grades/reports for those.
--   * Students can read their own data and write only their own contact info.
--   * All policies require account_status = 'approved' (except reading own
--     profile, so the pending screen still works).
-- =============================================================================

-- Enable RLS on every table
alter table public.profiles          enable row level security;
alter table public.students          enable row level security;
alter table public.teachers          enable row level security;
alter table public.programs          enable row level security;
alter table public.courses           enable row level security;
alter table public.enrollments       enable row level security;
alter table public.attendance        enable row level security;
alter table public.assessments       enable row level security;
alter table public.grades            enable row level security;
alter table public.payments          enable row level security;
alter table public.teacher_reports   enable row level security;
alter table public.announcements     enable row level security;
alter table public.notifications     enable row level security;
alter table public.audit_logs        enable row level security;
alter table public.course_resources  enable row level security;

-- Helper: is admin & approved
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'approved'
  );
$$;

-- Helper: is teacher & approved
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'teacher'
      and status = 'approved'
  );
$$;

-- Helper: is student & approved
create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'student'
      and status = 'approved'
  );
$$;

-- =============================================================================
-- profiles
-- =============================================================================
drop policy if exists profiles_self_read       on public.profiles;
drop policy if exists profiles_admin_read_all  on public.profiles;
drop policy if exists profiles_self_update     on public.profiles;
drop policy if exists profiles_admin_update    on public.profiles;
drop policy if exists profiles_admin_delete    on public.profiles;

create policy profiles_self_read on public.profiles
  for select using (id = auth.uid());

create policy profiles_admin_read_all on public.profiles
  for select using (public.is_admin());

create policy profiles_self_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy profiles_admin_update on public.profiles
  for update using (public.is_admin());

create policy profiles_admin_delete on public.profiles
  for delete using (public.is_admin());

-- =============================================================================
-- students
-- =============================================================================
drop policy if exists students_self_read     on public.students;
drop policy if exists students_admin_all     on public.students;
drop policy if exists students_teacher_read  on public.students;
drop policy if exists students_self_update   on public.students;

create policy students_self_read on public.students
  for select using (profile_id = auth.uid());

create policy students_admin_all on public.students
  for all using (public.is_admin()) with check (public.is_admin());

create policy students_teacher_read on public.students
  for select using (
    public.is_teacher() and exists (
      select 1
      from public.enrollments e
      join public.courses c on c.id = e.course_id
      join public.teachers t on t.id = c.teacher_id
      where e.student_id = students.id and t.profile_id = auth.uid()
    )
  );

create policy students_self_update on public.students
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- =============================================================================
-- teachers
-- =============================================================================
drop policy if exists teachers_self_read    on public.teachers;
drop policy if exists teachers_admin_all    on public.teachers;
drop policy if exists teachers_anyone_read  on public.teachers;
drop policy if exists teachers_self_update  on public.teachers;

create policy teachers_self_read on public.teachers
  for select using (profile_id = auth.uid());

create policy teachers_admin_all on public.teachers
  for all using (public.is_admin()) with check (public.is_admin());

-- Approved students can read teacher bios for the courses they're enrolled in
create policy teachers_anyone_read on public.teachers
  for select using (
    public.is_student() or public.is_teacher()
  );

create policy teachers_self_update on public.teachers
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- =============================================================================
-- programs
-- =============================================================================
drop policy if exists programs_read_all   on public.programs;
drop policy if exists programs_admin_all  on public.programs;

create policy programs_read_all on public.programs
  for select using (
    public.is_admin() or public.is_teacher() or public.is_student()
  );

create policy programs_admin_all on public.programs
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- courses
-- =============================================================================
drop policy if exists courses_read_all     on public.courses;
drop policy if exists courses_admin_all    on public.courses;

create policy courses_read_all on public.courses
  for select using (
    public.is_admin() or public.is_teacher() or public.is_student()
  );

create policy courses_admin_all on public.courses
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- enrollments
-- =============================================================================
drop policy if exists enrollments_admin_all       on public.enrollments;
drop policy if exists enrollments_student_self    on public.enrollments;
drop policy if exists enrollments_teacher_view    on public.enrollments;

create policy enrollments_admin_all on public.enrollments
  for all using (public.is_admin()) with check (public.is_admin());

create policy enrollments_student_self on public.enrollments
  for select using (
    exists (
      select 1 from public.students s
      where s.id = enrollments.student_id and s.profile_id = auth.uid()
    )
  );

create policy enrollments_teacher_view on public.enrollments
  for select using (
    public.is_teacher() and exists (
      select 1 from public.courses c
      join public.teachers t on t.id = c.teacher_id
      where c.id = enrollments.course_id and t.profile_id = auth.uid()
    )
  );

-- =============================================================================
-- attendance
-- =============================================================================
drop policy if exists attendance_admin_all      on public.attendance;
drop policy if exists attendance_teacher_rw     on public.attendance;
drop policy if exists attendance_student_read   on public.attendance;

create policy attendance_admin_all on public.attendance
  for all using (public.is_admin()) with check (public.is_admin());

create policy attendance_teacher_rw on public.attendance
  for all using (
    public.is_teacher() and exists (
      select 1
      from public.enrollments e
      join public.courses c on c.id = e.course_id
      join public.teachers t on t.id = c.teacher_id
      where e.id = attendance.enrollment_id and t.profile_id = auth.uid()
    )
  ) with check (
    public.is_teacher() and exists (
      select 1
      from public.enrollments e
      join public.courses c on c.id = e.course_id
      join public.teachers t on t.id = c.teacher_id
      where e.id = attendance.enrollment_id and t.profile_id = auth.uid()
    )
  );

create policy attendance_student_read on public.attendance
  for select using (
    exists (
      select 1
      from public.enrollments e
      join public.students s on s.id = e.student_id
      where e.id = attendance.enrollment_id and s.profile_id = auth.uid()
    )
  );

-- =============================================================================
-- assessments
-- =============================================================================
drop policy if exists assessments_admin_all   on public.assessments;
drop policy if exists assessments_teacher_rw  on public.assessments;
drop policy if exists assessments_student_r   on public.assessments;

create policy assessments_admin_all on public.assessments
  for all using (public.is_admin()) with check (public.is_admin());

create policy assessments_teacher_rw on public.assessments
  for all using (
    public.is_teacher() and exists (
      select 1 from public.courses c
      join public.teachers t on t.id = c.teacher_id
      where c.id = assessments.course_id and t.profile_id = auth.uid()
    )
  ) with check (
    public.is_teacher() and exists (
      select 1 from public.courses c
      join public.teachers t on t.id = c.teacher_id
      where c.id = assessments.course_id and t.profile_id = auth.uid()
    )
  );

create policy assessments_student_r on public.assessments
  for select using (
    exists (
      select 1 from public.enrollments e
      join public.students s on s.id = e.student_id
      where e.course_id = assessments.course_id and s.profile_id = auth.uid()
    )
  );

-- =============================================================================
-- grades
-- =============================================================================
drop policy if exists grades_admin_all     on public.grades;
drop policy if exists grades_teacher_rw    on public.grades;
drop policy if exists grades_student_read  on public.grades;

create policy grades_admin_all on public.grades
  for all using (public.is_admin()) with check (public.is_admin());

create policy grades_teacher_rw on public.grades
  for all using (
    public.is_teacher() and exists (
      select 1
      from public.enrollments e
      join public.courses c on c.id = e.course_id
      join public.teachers t on t.id = c.teacher_id
      where e.id = grades.enrollment_id and t.profile_id = auth.uid()
    )
  ) with check (
    public.is_teacher() and exists (
      select 1
      from public.enrollments e
      join public.courses c on c.id = e.course_id
      join public.teachers t on t.id = c.teacher_id
      where e.id = grades.enrollment_id and t.profile_id = auth.uid()
    )
  );

create policy grades_student_read on public.grades
  for select using (
    exists (
      select 1
      from public.enrollments e
      join public.students s on s.id = e.student_id
      where e.id = grades.enrollment_id and s.profile_id = auth.uid()
    )
  );

-- =============================================================================
-- payments
-- =============================================================================
drop policy if exists payments_admin_all     on public.payments;
drop policy if exists payments_student_read  on public.payments;

create policy payments_admin_all on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

create policy payments_student_read on public.payments
  for select using (
    exists (
      select 1 from public.students s
      where s.id = payments.student_id and s.profile_id = auth.uid()
    )
  );

-- =============================================================================
-- teacher_reports
-- =============================================================================
drop policy if exists reports_admin_all      on public.teacher_reports;
drop policy if exists reports_teacher_rw     on public.teacher_reports;
drop policy if exists reports_student_read   on public.teacher_reports;

create policy reports_admin_all on public.teacher_reports
  for all using (public.is_admin()) with check (public.is_admin());

create policy reports_teacher_rw on public.teacher_reports
  for all using (
    public.is_teacher() and exists (
      select 1 from public.teachers t
      where t.id = teacher_reports.teacher_id and t.profile_id = auth.uid()
    )
  ) with check (
    public.is_teacher() and exists (
      select 1 from public.teachers t
      where t.id = teacher_reports.teacher_id and t.profile_id = auth.uid()
    )
  );

create policy reports_student_read on public.teacher_reports
  for select using (
    is_visible_to_student = true and exists (
      select 1 from public.students s
      where s.id = teacher_reports.student_id and s.profile_id = auth.uid()
    )
  );

-- =============================================================================
-- announcements
-- =============================================================================
drop policy if exists announcements_admin_all   on public.announcements;
drop policy if exists announcements_audience_r  on public.announcements;

create policy announcements_admin_all on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());

create policy announcements_audience_r on public.announcements
  for select using (
    audience = 'all'
    or (audience = 'admins'   and public.is_admin())
    or (audience = 'teachers' and public.is_teacher())
    or (audience = 'students' and public.is_student())
  );

-- =============================================================================
-- notifications
-- =============================================================================
drop policy if exists notifications_self  on public.notifications;
drop policy if exists notifications_admin on public.notifications;

create policy notifications_self on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_admin on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- audit_logs (admin only)
-- =============================================================================
drop policy if exists audit_logs_admin on public.audit_logs;

create policy audit_logs_admin on public.audit_logs
  for all using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- course_resources
-- =============================================================================
drop policy if exists resources_admin_all     on public.course_resources;
drop policy if exists resources_teacher_rw    on public.course_resources;
drop policy if exists resources_student_read  on public.course_resources;

create policy resources_admin_all on public.course_resources
  for all using (public.is_admin()) with check (public.is_admin());

create policy resources_teacher_rw on public.course_resources
  for all using (
    public.is_teacher() and exists (
      select 1 from public.courses c
      join public.teachers t on t.id = c.teacher_id
      where c.id = course_resources.course_id and t.profile_id = auth.uid()
    )
  ) with check (
    public.is_teacher() and exists (
      select 1 from public.courses c
      join public.teachers t on t.id = c.teacher_id
      where c.id = course_resources.course_id and t.profile_id = auth.uid()
    )
  );

create policy resources_student_read on public.course_resources
  for select using (
    exists (
      select 1 from public.enrollments e
      join public.students s on s.id = e.student_id
      where e.course_id = course_resources.course_id and s.profile_id = auth.uid()
    )
  );
