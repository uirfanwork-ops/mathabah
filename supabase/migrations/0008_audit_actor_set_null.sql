-- Keep audit history when a user is deleted: students/teachers now appear as
-- actors (register, email_confirmed, self_enroll, record_grades, ...). Without
-- this, deleting such a profile would violate the foreign key.
alter table public.audit_logs
  drop constraint if exists audit_logs_actor_id_fkey;
alter table public.audit_logs
  add constraint audit_logs_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

create index if not exists audit_logs_action_idx on public.audit_logs(action, created_at desc);
