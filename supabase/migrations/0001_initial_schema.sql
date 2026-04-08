-- =============================================================================
-- Mathabah Institute — Initial schema
-- =============================================================================
-- This migration provisions the core tables backing the student management CRM.
-- All user-facing tables reference auth.users via the profiles table.
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'teacher', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type enrollment_status as enum ('active', 'completed', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attendance_status as enum ('present', 'absent', 'late', 'excused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash', 'bank_transfer', 'card', 'cheque', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type report_type as enum ('mid_course', 'end_of_course', 'concern');
exception when duplicate_object then null; end $$;

do $$ begin
  create type announcement_audience as enum ('all', 'admins', 'teachers', 'students');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- profiles — one row per auth user
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  avatar_url text,
  role user_role not null default 'student',
  status account_status not null default 'pending',
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(status);

-- -----------------------------------------------------------------------------
-- students
-- -----------------------------------------------------------------------------
create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  student_number text unique,
  date_of_birth date,
  gender text,
  address text,
  city text,
  country text,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  emergency_contact text,
  enrollment_date date default now(),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists students_profile_idx on public.students(profile_id);

-- -----------------------------------------------------------------------------
-- teachers
-- -----------------------------------------------------------------------------
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  employee_number text unique,
  bio text,
  specialization text,
  qualifications text,
  hire_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teachers_profile_idx on public.teachers(profile_id);

-- -----------------------------------------------------------------------------
-- programs
-- -----------------------------------------------------------------------------
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  description text,
  duration_months int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- courses
-- -----------------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.programs(id) on delete set null,
  teacher_id uuid references public.teachers(id) on delete set null,
  name text not null,
  code text unique,
  description text,
  schedule text,
  capacity int,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists courses_program_idx on public.courses(program_id);
create index if not exists courses_teacher_idx on public.courses(teacher_id);

-- -----------------------------------------------------------------------------
-- enrollments
-- -----------------------------------------------------------------------------
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (student_id, course_id)
);
create index if not exists enrollments_student_idx on public.enrollments(student_id);
create index if not exists enrollments_course_idx on public.enrollments(course_id);

-- -----------------------------------------------------------------------------
-- attendance
-- -----------------------------------------------------------------------------
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  session_date date not null,
  status attendance_status not null default 'present',
  notes text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (enrollment_id, session_date)
);
create index if not exists attendance_enrollment_idx on public.attendance(enrollment_id);

-- -----------------------------------------------------------------------------
-- assessments
-- -----------------------------------------------------------------------------
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  description text,
  max_score numeric(6,2) not null default 100,
  weight numeric(5,2) not null default 1,
  due_date date,
  created_at timestamptz not null default now()
);
create index if not exists assessments_course_idx on public.assessments(course_id);

-- -----------------------------------------------------------------------------
-- grades
-- -----------------------------------------------------------------------------
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  score numeric(6,2),
  feedback text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, assessment_id)
);
create index if not exists grades_enrollment_idx on public.grades(enrollment_id);

-- -----------------------------------------------------------------------------
-- payments
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  payment_date date not null default now(),
  method payment_method not null default 'bank_transfer',
  reference text,
  notes text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists payments_student_idx on public.payments(student_id);
create index if not exists payments_date_idx on public.payments(payment_date);

-- -----------------------------------------------------------------------------
-- teacher reports — mid-course / end-of-course / concern
-- -----------------------------------------------------------------------------
create table if not exists public.teacher_reports (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  course_id uuid references public.courses(id) on delete set null,
  type report_type not null default 'mid_course',
  title text not null,
  content text not null,
  is_visible_to_student boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teacher_reports_student_idx on public.teacher_reports(student_id);
create index if not exists teacher_reports_teacher_idx on public.teacher_reports(teacher_id);

-- -----------------------------------------------------------------------------
-- announcements
-- -----------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  audience announcement_audience not null default 'all',
  created_by uuid references public.profiles(id),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists announcements_audience_idx on public.announcements(audience);

-- -----------------------------------------------------------------------------
-- in-app notifications
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, is_read);

-- -----------------------------------------------------------------------------
-- audit log
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- course resources (Phase 6)
-- -----------------------------------------------------------------------------
create table if not exists public.course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  description text,
  file_url text,
  link_url text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists course_resources_course_idx on public.course_resources(course_id);

-- =============================================================================
-- Helper functions
-- =============================================================================

-- Trigger function: when an auth.users row is created, insert a profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'student',
    'pending'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger function: keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'profiles', 'students', 'teachers', 'programs', 'courses',
      'grades', 'teacher_reports'
    ])
  loop
    execute format(
      'drop trigger if exists touch_%1$s_updated_at on public.%1$s;
       create trigger touch_%1$s_updated_at
         before update on public.%1$s
         for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- Convenience helper: returns the role of the calling user
create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Convenience helper: returns the status of the calling user
create or replace function public.current_user_status()
returns account_status
language sql
stable
security definer
set search_path = public
as $$
  select status from public.profiles where id = auth.uid();
$$;
