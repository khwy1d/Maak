-- Let the existing staff inbox carry either an order or a booking notification.
alter table public.staff_notifications
  alter column order_id drop not null,
  add column if not exists booking_id uuid references public.bookings(id) on delete cascade;

create unique index if not exists staff_notifications_user_booking_uidx
  on public.staff_notifications(user_id, booking_id)
  where booking_id is not null;

alter table public.bookings
  add column if not exists review_assignee_id uuid references auth.users(id) on delete set null,
  add column if not exists review_assignee_name text,
  add column if not exists review_started_at timestamptz;

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

create or replace function public.admin_list_bookings()
returns setof public.bookings
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.is_staff() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  return query
  select * from public.bookings
  order by created_at desc
  limit 500;
end;
$function$;

revoke all on function public.admin_list_bookings() from public, anon;
grant execute on function public.admin_list_bookings() to authenticated;

create or replace function public.claim_booking_review(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor uuid := auth.uid();
  claimed public.bookings;
  actor_name text;
begin
  if actor is null or not public.is_staff() then
    raise exception 'Staff access required' using errcode = '42501';
  end if;

  select full_name into actor_name from public.profiles where id = actor;
  update public.bookings
  set review_assignee_id = actor,
      review_assignee_name = actor_name,
      review_started_at = coalesce(review_started_at, now())
  where id = p_booking_id
    and (review_assignee_id is null or review_assignee_id = actor)
  returning * into claimed;

  if not found then
    raise exception 'Booking is already being reviewed by another staff member' using errcode = '55000';
  end if;

  return claimed;
end;
$function$;

revoke all on function public.claim_booking_review(uuid) from public, anon;
grant execute on function public.claim_booking_review(uuid) to authenticated;

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
  actor uuid := auth.uid();
  updated public.bookings;
begin
  if actor is null or not public.is_staff() then
    raise exception 'Staff access required' using errcode = '42501';
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
    and (public.is_admin() or review_assignee_id = actor)
  returning * into updated;

  if not found then
    raise exception 'Booking not found or not assigned to this staff member' using errcode = '42501';
  end if;
  return updated;
end;
$function$;

revoke all on function public.admin_update_booking(uuid, text, text) from public, anon;
grant execute on function public.admin_update_booking(uuid, text, text) to authenticated;
