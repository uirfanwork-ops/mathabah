-- =============================================================================
-- Auto-assign student_number from profiles.display_id
-- =============================================================================
-- When a students row is inserted (via approval or admin-create), copy the
-- profile's display_id into student_number so every student gets a unique
-- ID without manual entry.
-- =============================================================================

create or replace function public.students_assign_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.student_number is null then
    select p.display_id into new.student_number
    from public.profiles p
    where p.id = new.profile_id;
  end if;
  return new;
end;
$$;

drop trigger if exists students_auto_number on public.students;
create trigger students_auto_number
  before insert on public.students
  for each row
  execute function public.students_assign_number();

-- Backfill existing students that have null student_number
update public.students s
set student_number = p.display_id
from public.profiles p
where p.id = s.profile_id
  and s.student_number is null;
