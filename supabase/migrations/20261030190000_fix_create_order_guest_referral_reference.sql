create or replace function public.create_order(
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_phone text,
  p_service text,
  p_request_data jsonb,
  p_referral_code text default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  created public.orders;
  created_new boolean;
  actor uuid := auth.uid();
  phone_value text := regexp_replace(trim(p_customer_phone), '[^0-9+]', '', 'g');
begin
  if p_idempotency_key is null or char_length(trim(p_customer_name)) not between 1 and 120
    or char_length(phone_value) not between 7 and 18 or char_length(trim(p_service)) not between 1 and 80
    or jsonb_typeof(p_request_data) <> 'object' or octet_length(p_request_data::text) > 20000 then
    raise exception 'Invalid order data' using errcode = '22023';
  end if;

  if actor is not null and not exists (select 1 from public.profiles where id = actor and phone = phone_value) then
    raise exception 'Phone does not match authenticated profile' using errcode = '42501';
  end if;

  insert into public.orders(idempotency_key, customer_id, customer_name, customer_phone, service, request_data, referral_code)
  values (p_idempotency_key, actor, trim(p_customer_name), phone_value, trim(p_service), p_request_data, null)
  on conflict (idempotency_key) do nothing
  returning * into created;
  created_new := found;
  if not created_new then
    select * into created from public.orders where idempotency_key = p_idempotency_key
      and customer_id is not distinct from actor and customer_phone = phone_value;
    if not found then raise exception 'Idempotency key belongs to a different customer' using errcode = '42501'; end if;
  end if;
  return created;
end;
$$;

-- Guest order submission is intentionally public; the function validates and
-- stores only bounded request data and never grants access to existing orders.
revoke all on function public.create_order(uuid,text,text,text,jsonb,text) from public;
grant execute on function public.create_order(uuid,text,text,text,jsonb,text) to anon, authenticated;
