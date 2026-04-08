-- =============================================================================
-- Mathabah Institute — human-readable display IDs per profile
-- =============================================================================
-- Adds a `display_id` column on profiles following the convention:
--
--   students:  S-NNNNNN  (e.g. S-482913)
--   teachers:  T-NNNNNN  (e.g. T-103847)
--   admins:    A-NNNNNN  (e.g. A-009217)
--
-- where NNNNNN is a zero-padded random 6-digit number that is globally
-- unique across the profiles table. Collision is handled by a retry loop
-- in the trigger function.
--
-- The value is assigned by a BEFORE INSERT / BEFORE UPDATE OF role trigger
-- so the application never needs to think about it: creating a profile or
-- changing its role produces the correct display_id automatically.
-- =============================================================================

alter table public.profiles
  add column if not exists display_id text unique;

-- Generator: picks a random 6-digit number with the role-specific prefix and
-- loops until it finds one that isn't already taken. 50 attempts is
-- astronomically safe against the ~1M code space even at thousands of users.
create or replace function public.generate_profile_display_id(role_arg public.user_role)
returns text
language plpgsql
as $$
declare
  prefix text;
  candidate text;
  attempts int := 0;
begin
  prefix := case role_arg
    when 'student' then 'S-'
    when 'teacher' then 'T-'
    when 'admin'   then 'A-'
  end;

  loop
    candidate := prefix || lpad(floor(random() * 1000000)::int::text, 6, '0');
    exit when not exists (
      select 1 from public.profiles where display_id = candidate
    );
    attempts := attempts + 1;
    if attempts > 50 then
      raise exception 'Could not generate unique display_id after 50 attempts';
    end if;
  end loop;

  return candidate;
end;
$$;

-- Trigger: assign on insert, and re-assign when the role column is updated
-- (role changes rotate the prefix to match). Left alone if display_id is
-- already set and role isn't changing.
create or replace function public.profiles_assign_display_id()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.display_id is null then
      new.display_id := public.generate_profile_display_id(new.role);
    end if;
  elsif tg_op = 'UPDATE' then
    -- role is in the trigger's `update of role` target list, so this fires
    -- even when the new value equals the old. Only regenerate on an actual
    -- change, or if display_id happens to be null.
    if new.display_id is null or new.role <> old.role then
      new.display_id := public.generate_profile_display_id(new.role);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_assign_display_id on public.profiles;
create trigger profiles_assign_display_id
  before insert or update of role on public.profiles
  for each row execute function public.profiles_assign_display_id();

-- Backfill: touch every existing row so the trigger generates their
-- display_id. `set role = role` is a no-op value-wise but puts `role` in the
-- update target list, which fires the `update of role` trigger.
update public.profiles set role = role where display_id is null;
