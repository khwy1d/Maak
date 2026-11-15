-- Restore the customer booking flow without granting direct table writes.
-- The RPC owns the insert and derives ownership from auth.uid().

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
  created_id uuid := gen_random_uuid();
  normalized_phone text := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9+]', '', 'g');
begin
  if char_length(btrim(coalesce(p_customer_name, ''))) not between 2 and 120
    or normalized_phone !~ '^\+[1-9][0-9]{6,14}$'
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
    id, user_id, customer_name, customer_phone, service_type,
    service_details, preferred_date, notes
  ) values (
    created_id, actor, btrim(p_customer_name), normalized_phone, btrim(p_service_type),
    coalesce(p_service_details, '{}'::jsonb), p_preferred_date, nullif(btrim(p_notes), '')
  );

  return created_id;
end;
$function$;

revoke all on function public.create_booking(text, text, text, jsonb, date, text) from public;
grant execute on function public.create_booking(text, text, text, jsonb, date, text) to anon, authenticated;

-- Customer reads are explicitly restricted to the authenticated owner.
alter table public.bookings enable row level security;
drop policy if exists "Customers can read their bookings" on public.bookings;
drop policy if exists "bookings_select_own" on public.bookings;
create policy "bookings_select_own"
  on public.bookings
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

-- SELECT is needed by the customer's own-bookings query; RLS remains authoritative.
revoke all on public.bookings from anon;
revoke insert, update, delete on public.bookings from authenticated;
grant select on public.bookings to authenticated;

-- A customer can cancel only their own pending or confirmed booking.
create or replace function public.cancel_own_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  updated_booking public.bookings;
begin
  if actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id
    and user_id = actor
    and status in ('pending', 'confirmed')
  returning * into updated_booking;

  if not found then
    raise exception 'Booking not found or cannot be cancelled' using errcode = '42501';
  end if;

  return updated_booking;
end;
$function$;

revoke all on function public.cancel_own_booking(uuid) from public;
grant execute on function public.cancel_own_booking(uuid) to authenticated;

-- Keep booking alerts reliable for every currently assigned admin/staff account.
create or replace function public.notify_staff_new_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.staff_notifications(user_id, booking_id, title, body)
  select ur.user_id, new.id, 'حجز جديد يحتاج مراجعة',
    'وصل حجز جديد من ' || new.customer_name || ' لخدمة ' || new.service_type
  from public.user_roles ur
  where ur.role in ('admin', 'staff')
  on conflict (user_id, booking_id) where booking_id is not null do nothing;
  return new;
end;
$function$;

drop trigger if exists bookings_notify_staff on public.bookings;
create trigger bookings_notify_staff
  after insert on public.bookings
  for each row execute function public.notify_staff_new_booking();

