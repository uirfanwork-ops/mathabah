-- -----------------------------------------------------------------------------
-- Assessment categories
--
-- Adds a free-form category column so admins/teachers can organise assessments
-- into buckets (exam, test, quiz, assignment, homework, reading, etc.). The
-- application constrains input to a known list; the column itself stays text
-- so new categories can be introduced without a migration.
-- -----------------------------------------------------------------------------
alter table public.assessments
  add column if not exists category text not null default 'assignment';

create index if not exists assessments_category_idx
  on public.assessments(category);
