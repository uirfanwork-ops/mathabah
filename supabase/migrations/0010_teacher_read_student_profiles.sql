-- Teachers could not read the profiles of their own students: every student
-- name in the teacher portal (students tab, attendance, grade entry) rendered
-- as "—". Grant read access to profiles of students enrolled in a course the
-- teacher is assigned to. The SECURITY DEFINER helper avoids RLS recursion
-- between profiles and enrollments/courses/teachers.
create or replace function public.teacher_teaches_profile(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id
    join public.courses c on c.id = e.course_id
    join public.teachers t on t.id = c.teacher_id
    where s.profile_id = target
      and t.profile_id = auth.uid()
  );
$$;

drop policy if exists profiles_teacher_read_students on public.profiles;
create policy profiles_teacher_read_students on public.profiles
  for select
  using (public.is_teacher() and public.teacher_teaches_profile(id));
