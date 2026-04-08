-- =============================================================================
-- Mathabah Institute — move contact (address/city/country) onto profiles
-- =============================================================================
-- These columns used to live on public.students only, which meant teachers
-- and admins had nowhere to store their address, and every lookup had to
-- join through students. They're intrinsic to the person, not to the
-- "student" role, so we lift them up onto profiles and drop the dupes.
-- The profile completion gate (phone + address required on first login)
-- also reads from here.
-- =============================================================================

alter table public.profiles
  add column if not exists address text,
  add column if not exists city    text,
  add column if not exists country text;

-- Backfill from public.students for any existing student whose profile
-- doesn't yet have contact fields populated.
update public.profiles p
set address = coalesce(p.address, s.address),
    city    = coalesce(p.city,    s.city),
    country = coalesce(p.country, s.country)
from public.students s
where s.profile_id = p.id;

-- Drop the redundant columns from students now that profiles is the
-- source of truth. Do this after the backfill.
alter table public.students
  drop column if exists address,
  drop column if exists city,
  drop column if exists country;
