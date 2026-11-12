-- M07: make retries idempotent at the database boundary.
-- A replay is accepted only when the key and the complete request payload match.
create or replace function public.create_order(
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_phone text,
  p_service text,
  p_request_data jsonb,
  p_referral_code text default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  created public.orders;
  created_new boolean;
  actor uuid := auth.uid();
  phone_value text := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9+]', '', 'g');
begin
  if p_idempotency_key is null
    or p_customer_name is null
    or char_length(trim(p_customer_name)) not between 1 and 120
    or phone_value !~ '^\\+[1-9][0-9]{6,14}$'
    or p_service is null
    or trim(p_service) not in (
      'flight', 'ground_transport', 'accommodation', 'car_rental',
      'medical_travel', 'security_clearance', 'umrah', 'real_estate', 'tourism'
    )
    or p_request_data is null
    or jsonb_typeof(p_request_data) <> 'object'
    or jsonb_typeof(p_request_data -> 'message') <> 'string'
    or char_length(p_request_data ->> 'message') not between 1 and 8000
    or octet_length(p_request_data::text) > 20000 then
    raise exception 'Invalid order data' using errcode = '22023';
  end if;

  if actor is not null and not exists (
    select 1 from public.profiles where id = actor and phone = phone_value
  ) then
    raise exception 'Phone does not match authenticated profile' using errcode = '42501';
  end if;

  insert into public.orders(
    idempotency_key, customer_id, customer_name, customer_phone,
    service, request_data, referral_code
  )
  values (
    p_idempotency_key, actor, trim(p_customer_name), phone_value,
    trim(p_service), p_request_data, null
  )
  on conflict (idempotency_key) do nothing
  returning * into created;

  created_new := found;

  if not created_new then
    select * into created
    from public.orders
    where idempotency_key = p_idempotency_key
      and customer_id is not distinct from actor
      and customer_name = trim(p_customer_name)
      and customer_phone = phone_value
      and service = trim(p_service)
      and request_data = p_request_data;

    if not found then
      raise exception 'Idempotency key was already used for a different request' using errcode = '22023';
    end if;
  end if;

  return to_jsonb(created) - 'admin_note' - 'idempotency_key';
end;
$$;

-- Wallet retries return the already-committed order when the same debit key
-- and amount are replayed. A new intentional debit must use a new key.
create or replace function public.apply_wallet_to_order(
  p_order_id uuid,
  p_amount numeric,
  p_idempotency_key uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  existing_debit public.wallet_transactions;
  available numeric;
  due numeric;
  debit_key text := 'debit:' || coalesce(p_idempotency_key::text, '');
begin
  if auth.uid() is null or p_idempotency_key is null
    or p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid wallet payment' using errcode = '22023';
  end if;

  select * into existing_debit
  from public.wallet_transactions
  where idempotency_key = debit_key;

  if found then
    if existing_debit.user_id <> auth.uid()
      or existing_debit.order_id <> p_order_id
      or existing_debit.kind <> 'booking_debit'
      or existing_debit.amount <> -p_amount then
      raise exception 'Idempotency key was already used for a different wallet debit' using errcode = '22023';
    end if;

    select * into o
    from public.orders
    where id = p_order_id and customer_id = auth.uid();

    if not found then
      raise exception 'Order not found' using errcode = 'P0002';
    end if;

    return to_jsonb(o) - 'admin_note' - 'idempotency_key';
  end if;

  select * into o
  from public.orders
  where id = p_order_id and customer_id = auth.uid()
  for update;

  if not found
    or o.total_amount is null
    or o.payment_status <> 'unpaid'
    or o.status in ('completed', 'cancelled') then
    raise exception 'Order cannot accept wallet payment' using errcode = '22023';
  end if;

  perform 1 from public.profiles where id = auth.uid() for update;

  due := greatest(o.total_amount - o.wallet_used, 0);
  available := public.current_wallet_balance(auth.uid());

  if p_amount > due or p_amount > available then
    raise exception 'Insufficient balance or amount exceeds due' using errcode = '22023';
  end if;

  insert into public.wallet_transactions(
    user_id, amount, kind, description, order_id, idempotency_key
  )
  values (
    auth.uid(), -p_amount, 'booking_debit', 'Wallet used for booking',
    p_order_id, debit_key
  );

  update public.orders
  set wallet_used = wallet_used + p_amount, updated_at = now()
  where id = p_order_id
  returning * into o;

  if o.wallet_used = o.total_amount then
    update public.orders
    set payment_status = 'paid', updated_at = now()
    where id = p_order_id
    returning * into o;
  end if;

  return to_jsonb(o) - 'admin_note' - 'idempotency_key';
end;
$$;

revoke all on function public.create_order(uuid, text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.apply_wallet_to_order(uuid, numeric, uuid) from public, anon, authenticated;
grant execute on function public.create_order(uuid, text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.apply_wallet_to_order(uuid, numeric, uuid) to authenticated;
