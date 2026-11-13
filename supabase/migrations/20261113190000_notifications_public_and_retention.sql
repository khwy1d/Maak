-- Public and user-scoped notifications with automatic seven-day retention.
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists notifications_created_at_idx
  on public.notifications (created_at desc);
create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Anyone can read global notifications" on public.notifications;
create policy "Anyone can read global notifications"
  on public.notifications for select
  to anon
  using (user_id is null);

drop policy if exists "Users can read global and own notifications" on public.notifications;
create policy "Users can read global and own notifications"
  on public.notifications for select
  to authenticated
  using (user_id is null or user_id = (select auth.uid()));

drop policy if exists "Admins can create notifications" on public.notifications;
create policy "Admins can create notifications"
  on public.notifications for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

drop policy if exists "Admins can update notifications" on public.notifications;
create policy "Admins can update notifications"
  on public.notifications for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

drop policy if exists "Admins can delete notifications" on public.notifications;
create policy "Admins can delete notifications"
  on public.notifications for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_id = (select auth.uid()) and role = 'admin'
    )
  );

grant select on public.notifications to anon, authenticated;
grant insert, update, delete on public.notifications to authenticated;

-- Remove any previous job with the same name before scheduling it again.
do $$
declare existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'maak-delete-expired-notifications'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end
$$;

select cron.schedule(
  'maak-delete-expired-notifications',
  '0 * * * *',
  $$delete from public.notifications where created_at < now() - interval '7 days'$$
);
