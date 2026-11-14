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
