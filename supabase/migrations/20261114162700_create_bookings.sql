-- Internal booking workflow for MAAK.
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 120),
  customer_phone text not null check (char_length(regexp_replace(customer_phone, '[^0-9]', '', 'g')) between 7 and 15),
  service_type text not null check (char_length(btrim(service_type)) between 1 and 80),
  service_details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(service_details) = 'object'),
  preferred_date date,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_created_at_desc_idx on public.bookings (created_at desc);

create or replace function public.set_booking_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_booking_updated_at();

alter table public.bookings enable row level security;

drop policy if exists "Anyone can create bookings" on public.bookings;
create policy "Anyone can create bookings"
  on public.bookings for insert
  to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));

drop policy if exists "Customers can read their bookings" on public.bookings;
create policy "Customers can read their bookings"
  on public.bookings for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Admins can manage all bookings" on public.bookings;
create policy "Admins can manage all bookings"
  on public.bookings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Anonymous clients can create a booking and receive its UUID without SELECT
-- access to the table. Authenticated users must use the phone on their profile.
create or replace function public.create_booking(
  p_customer_name text,
  p_customer_phone text,
  p_service_type text,
  p_service_details jsonb default '{}'::jsonb,
  p_preferred_date date default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  created_id uuid;
  normalized_phone text := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9+]', '', 'g');
begin
  if char_length(btrim(coalesce(p_customer_name, ''))) not between 2 and 120
    or normalized_phone !~ '^\\+[1-9][0-9]{6,14}$'
    or char_length(btrim(coalesce(p_service_type, ''))) not between 1 and 80
    or jsonb_typeof(coalesce(p_service_details, '{}'::jsonb)) <> 'object'
    or octet_length(coalesce(p_service_details, '{}'::jsonb)::text) > 20000
    or char_length(coalesce(p_notes, '')) > 4000 then
    raise exception 'Invalid booking data' using errcode = '22023';
  end if;

  if actor is not null and not exists (
    select 1 from public.profiles where id = actor and phone = normalized_phone
  ) then
    raise exception 'Phone does not match authenticated profile' using errcode = '42501';
  end if;

  insert into public.bookings (
    user_id, customer_name, customer_phone, service_type,
    service_details, preferred_date, notes
  ) values (
    actor, btrim(p_customer_name), normalized_phone, btrim(p_service_type),
    coalesce(p_service_details, '{}'::jsonb), p_preferred_date, nullif(btrim(p_notes), '')
  )
  returning id into created_id;

  return created_id;
end;
$function$;

revoke all on function public.create_booking(text, text, text, jsonb, date, text) from public;
grant execute on function public.create_booking(text, text, text, jsonb, date, text) to anon, authenticated;

-- Column-level grants keep admin_notes inaccessible to customer sessions.
revoke all on public.bookings from anon, authenticated;
grant insert (user_id, customer_name, customer_phone, service_type, service_details, preferred_date, notes)
  on public.bookings to anon, authenticated;
grant select (id, user_id, customer_name, customer_phone, service_type, service_details,
              preferred_date, notes, status, created_at, updated_at)
  on public.bookings to authenticated;

-- This owner-rights view deliberately filters with is_admin(); only authenticated
-- users can query it, and non-admins receive zero rows. The base table remains
-- protected by RLS and column-level grants.
create or replace view public.admin_bookings
with (security_barrier = true)
as
select id, user_id, customer_name, customer_phone, service_type, service_details,
       preferred_date, notes, status, admin_notes, created_at, updated_at
from public.bookings
where public.is_admin();

grant select on public.admin_bookings to authenticated;

create or replace function public.admin_update_booking(
  p_booking_id uuid,
  p_status text,
  p_admin_notes text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $function$
declare
  updated public.bookings;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if p_status not in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled') then
    raise exception 'Invalid booking status' using errcode = '22023';
  end if;

  if p_admin_notes is not null and char_length(p_admin_notes) > 4000 then
    raise exception 'Admin notes are too long' using errcode = '22023';
  end if;

  update public.bookings
  set status = p_status,
      admin_notes = p_admin_notes
  where id = p_booking_id
  returning * into updated;

  if not found then
    raise exception 'Booking not found' using errcode = 'P0002';
  end if;

  return updated;
end;
$function$;

revoke all on function public.admin_update_booking(uuid, text, text) from public, anon;
grant execute on function public.admin_update_booking(uuid, text, text) to authenticated;

grant usage on schema public to anon, authenticated;
