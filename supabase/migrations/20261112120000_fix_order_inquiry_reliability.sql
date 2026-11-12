-- M07/M08: make order creation retry-safe and validate service input at the database boundary.
-- The migration is intentionally separate from deployment; apply it in staging first.

create or replace function public.create_order(
  p_idempotency_key uuid,
  p_customer_name text,
  p_customer_phone text,
  p_service text,
  p_request_data jsonb,
  p_referral_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  created public.orders;
  created_new boolean;
  actor uuid := auth.uid();
  phone_value text := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9+]', '', 'g');
  date_text text;
  parsed_date date;
  previous_date date;
  check_in date;
  check_out date;
  form_data jsonb := p_request_data -> 'form_data';
begin
  -- Accept +E.164, 00-prefixed, or country-code-only international numbers.
  -- Store all variants in canonical +E.164 form, matching the Auth profile contract.
  if phone_value like '00%' then
    phone_value := '+' || substr(phone_value, 3);
  elsif phone_value !~ '^\+' then
    phone_value := '+' || phone_value;
  end if;

  if p_idempotency_key is null
    or p_customer_name is null
    or char_length(trim(p_customer_name)) not between 2 and 120
    or phone_value !~ '^\+[1-9][0-9]{6,14}$'
    or p_service is null
    or trim(p_service) not in (
      'flight', 'ground_transport', 'accommodation', 'car_rental',
      'medical_travel', 'security_clearance', 'umrah', 'real_estate', 'tourism'
    )
    or p_request_data is null
    or jsonb_typeof(p_request_data) <> 'object'
    or not (p_request_data ? 'message')
    or jsonb_typeof(p_request_data -> 'message') <> 'string'
    or char_length(p_request_data ->> 'message') not between 1 and 8000
    or octet_length(p_request_data::text) > 20000 then
    raise exception 'Invalid order data' using errcode = '22023';
  end if;

  -- Hotel destination fields are required even if a caller bypasses the UI.
  if trim(p_service) = 'accommodation' then
    if nullif(trim(p_request_data ->> 'country'), '') is null
      or char_length(trim(p_request_data ->> 'country')) > 80
      or nullif(trim(p_request_data ->> 'city'), '') is null
      or char_length(trim(p_request_data ->> 'city')) > 120
      or char_length(coalesce(p_request_data ->> 'area', '')) > 120 then
      raise exception 'Invalid accommodation destination' using errcode = '22023';
    end if;
  end if;

  -- All service forms send ISO date fields separately from the display message.
  -- Reject malformed, impossible, past, or non-chronological dates server-side.
  if p_request_data ? 'date_values' then
    if jsonb_typeof(p_request_data -> 'date_values') <> 'array' then
      raise exception 'Invalid date values' using errcode = '22023';
    end if;
    if jsonb_array_length(p_request_data -> 'date_values') > 12 then
      raise exception 'Too many date values' using errcode = '22023';
    end if;

    begin
      previous_date := null;
      for date_text in
        select jsonb_array_elements_text(p_request_data -> 'date_values')
      loop
        if date_text is null or date_text !~ '^\d{4}-\d{2}-\d{2}$' then
          raise exception 'Invalid date value' using errcode = '22023';
        end if;

        parsed_date := date_text::date;
        if parsed_date < current_date then
          raise exception 'Travel dates cannot be in the past' using errcode = '22023';
        end if;
        if previous_date is not null and parsed_date <= previous_date then
          raise exception 'Travel dates must be in chronological order' using errcode = '22023';
        end if;
        previous_date := parsed_date;
      end loop;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        raise exception 'Invalid date value' using errcode = '22023';
    end;
  end if;

  -- Hotel dates are optional, but if present they must be valid and ordered.
  if trim(p_service) = 'accommodation' then
    begin
      check_in := null;
      check_out := null;

      if nullif(p_request_data ->> 'check_in_date', '') is not null then
        if (p_request_data ->> 'check_in_date') !~ '^\d{4}-\d{2}-\d{2}$' then
          raise exception 'Invalid check-in date' using errcode = '22023';
        end if;
        check_in := (p_request_data ->> 'check_in_date')::date;
      end if;

      if nullif(p_request_data ->> 'check_out_date', '') is not null then
        if (p_request_data ->> 'check_out_date') !~ '^\d{4}-\d{2}-\d{2}$' then
          raise exception 'Invalid check-out date' using errcode = '22023';
        end if;
        check_out := (p_request_data ->> 'check_out_date')::date;
      end if;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        raise exception 'Invalid accommodation dates' using errcode = '22023';
    end;

    if check_in is not null and check_in < current_date then
      raise exception 'Check-in date cannot be in the past' using errcode = '22023';
    end if;
    if check_out is not null and check_out < current_date then
      raise exception 'Check-out date cannot be in the past' using errcode = '22023';
    end if;
    if check_in is not null and check_out is not null and check_out <= check_in then
      raise exception 'Check-out must be after check-in' using errcode = '22023';
    end if;
  end if;

  -- M08: validate the structured fields that each service form submits.
  -- The WhatsApp message is presentation text and is never trusted as field data.
  if jsonb_typeof(form_data) <> 'object' then
    raise exception 'Missing structured service data' using errcode = '22023';
  end if;

  if trim(p_service) = 'flight' then
    if nullif(trim(form_data ->> 'departure'), '') is null
      or char_length(trim(form_data ->> 'departure')) > 120
      or nullif(trim(form_data ->> 'destination'), '') is null
      or char_length(trim(form_data ->> 'destination')) > 120
      or form_data ->> 'trip_type' not in ('oneway', 'return')
      or coalesce(form_data ->> 'departure_date', '') !~ '^\\d{4}-\\d{2}-\\d{2}  if actor is not null and not exists (
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

-- M07: replaying the same wallet debit returns the committed order without
-- inserting a second ledger entry or deducting the balance again.
create or replace function public.apply_wallet_to_order(
  p_order_id uuid,
  p_amount numeric,
  p_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  existing_debit public.wallet_transactions;
  available numeric;
  due numeric;
  debit_key text := 'debit:' || coalesce(p_idempotency_key::text, '');
begin
  if auth.uid() is null
    or p_idempotency_key is null
    or p_amount is null
    or p_amount <= 0
    or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid wallet payment' using errcode = '22023';
  end if;

  select * into o
  from public.orders
  where id = p_order_id and customer_id = auth.uid()
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
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

    return to_jsonb(o) - 'admin_note' - 'idempotency_key';
  end if;

  if o.total_amount is null
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

      or coalesce(form_data ->> 'passenger_count', '') !~ '^[1-9][0-9]?  if actor is not null and not exists (
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

-- M07: replaying the same wallet debit returns the committed order without
-- inserting a second ledger entry or deducting the balance again.
create or replace function public.apply_wallet_to_order(
  p_order_id uuid,
  p_amount numeric,
  p_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  existing_debit public.wallet_transactions;
  available numeric;
  due numeric;
  debit_key text := 'debit:' || coalesce(p_idempotency_key::text, '');
begin
  if auth.uid() is null
    or p_idempotency_key is null
    or p_amount is null
    or p_amount <= 0
    or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid wallet payment' using errcode = '22023';
  end if;

  select * into o
  from public.orders
  where id = p_order_id and customer_id = auth.uid()
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
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

    return to_jsonb(o) - 'admin_note' - 'idempotency_key';
  end if;

  if o.total_amount is null
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

      or (form_data ->> 'passenger_count')::integer > 30
      or jsonb_typeof(form_data -> 'passenger_names') <> 'array'
      or jsonb_array_length(form_data -> 'passenger_names') <> (form_data ->> 'passenger_count')::integer
      or exists (select 1 from jsonb_array_elements_text(form_data -> 'passenger_names') as n(value)
        where char_length(trim(n.value)) not between 2 and 120)
      or jsonb_array_length(coalesce(p_request_data -> 'date_values', '[]'::jsonb)) < 1
      or (form_data ->> 'trip_type' = 'return' and coalesce(form_data ->> 'return_date', '') !~ '^\\d{4}-\\d{2}-\\d{2}  if actor is not null and not exists (
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

-- M07: replaying the same wallet debit returns the committed order without
-- inserting a second ledger entry or deducting the balance again.
create or replace function public.apply_wallet_to_order(
  p_order_id uuid,
  p_amount numeric,
  p_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  existing_debit public.wallet_transactions;
  available numeric;
  due numeric;
  debit_key text := 'debit:' || coalesce(p_idempotency_key::text, '');
begin
  if auth.uid() is null
    or p_idempotency_key is null
    or p_amount is null
    or p_amount <= 0
    or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid wallet payment' using errcode = '22023';
  end if;

  select * into o
  from public.orders
  where id = p_order_id and customer_id = auth.uid()
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
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

    return to_jsonb(o) - 'admin_note' - 'idempotency_key';
  end if;

  if o.total_amount is null
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
)
      or (form_data ->> 'trip_type' = 'oneway' and nullif(form_data ->> 'return_date', '') is not null) then
      raise exception 'Invalid flight request fields' using errcode = '22023';
    end if;
  elsif trim(p_service) = 'ground_transport' then
    if form_data ->> 'departure_country' not in ('YE', 'SA')
      or nullif(trim(form_data ->> 'departure_region'), '') is null
      or form_data ->> 'destination_country' not in ('YE', 'SA')
      or nullif(trim(form_data ->> 'destination_region'), '') is null then
      raise exception 'Invalid ground transport route' using errcode = '22023';
    end if;
  elsif trim(p_service) = 'accommodation' then
    if nullif(trim(form_data ->> 'country'), '') is null
      or nullif(trim(form_data ->> 'city'), '') is null then
      raise exception 'Invalid accommodation destination' using errcode = '22023';
    end if;
  elsif trim(p_service) = 'car_rental' then
    if form_data ->> 'country' not in ('YE', 'EG')
      or nullif(trim(form_data ->> 'pickup_city'), '') is null
      or char_length(trim(form_data ->> 'pickup_city')) > 120 then
      raise exception 'Invalid car rental location' using errcode = '22023';
    end if;
  elsif trim(p_service) = 'medical_travel' then
    if nullif(trim(form_data ->> 'purpose'), '') is null
      or char_length(trim(form_data ->> 'purpose')) > 80
      or nullif(trim(form_data ->> 'destination'), '') is null
      or char_length(trim(form_data ->> 'destination')) > 120 then
      raise exception 'Invalid medical travel request' using errcode = '22023';
    end if;
  elsif trim(p_service) = 'security_clearance' then
    if form_data ->> 'request_type' not in ('new', 'follow-up')
      or form_data ->> 'purpose' not in ('tourism', 'family', 'business', 'transit', 'other') then
      raise exception 'Invalid security clearance request' using errcode = '22023';
    end if;
  elsif trim(p_service) = 'umrah' then
    if coalesce(form_data ->> 'date', '') !~ '^\\d{4}-\\d{2}-\\d{2}  if actor is not null and not exists (
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

-- M07: replaying the same wallet debit returns the committed order without
-- inserting a second ledger entry or deducting the balance again.
create or replace function public.apply_wallet_to_order(
  p_order_id uuid,
  p_amount numeric,
  p_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  existing_debit public.wallet_transactions;
  available numeric;
  due numeric;
  debit_key text := 'debit:' || coalesce(p_idempotency_key::text, '');
begin
  if auth.uid() is null
    or p_idempotency_key is null
    or p_amount is null
    or p_amount <= 0
    or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid wallet payment' using errcode = '22023';
  end if;

  select * into o
  from public.orders
  where id = p_order_id and customer_id = auth.uid()
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
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

    return to_jsonb(o) - 'admin_note' - 'idempotency_key';
  end if;

  if o.total_amount is null
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

      or coalesce(form_data ->> 'travellers', '') !~ '^[1-9]  if actor is not null and not exists (
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

-- M07: replaying the same wallet debit returns the committed order without
-- inserting a second ledger entry or deducting the balance again.
create or replace function public.apply_wallet_to_order(
  p_order_id uuid,
  p_amount numeric,
  p_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  existing_debit public.wallet_transactions;
  available numeric;
  due numeric;
  debit_key text := 'debit:' || coalesce(p_idempotency_key::text, '');
begin
  if auth.uid() is null
    or p_idempotency_key is null
    or p_amount is null
    or p_amount <= 0
    or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid wallet payment' using errcode = '22023';
  end if;

  select * into o
  from public.orders
  where id = p_order_id and customer_id = auth.uid()
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
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

    return to_jsonb(o) - 'admin_note' - 'idempotency_key';
  end if;

  if o.total_amount is null
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

      or jsonb_typeof(form_data -> 'passenger_names') <> 'array'
      or jsonb_array_length(form_data -> 'passenger_names') <> (form_data ->> 'travellers')::integer
      or exists (select 1 from jsonb_array_elements_text(form_data -> 'passenger_names') as n(value)
        where char_length(trim(n.value)) not between 2 and 120)
      or form_data ->> 'passport_files_attached' <> 'true' then
      raise exception 'Invalid Umrah request fields' using errcode = '22023';
    end if;
  elsif trim(p_service) = 'real_estate' then
    if form_data ->> 'service_type' not in ('rent', 'buy', 'sell', 'management')
      or form_data ->> 'property_type' not in ('apartment', 'house', 'land', 'commercial', 'other')
      or nullif(trim(form_data ->> 'city'), '') is null
      or char_length(trim(form_data ->> 'city')) > 120 then
      raise exception 'Invalid real estate request' using errcode = '22023';
    end if;
  elsif trim(p_service) = 'tourism' then
    if form_data ->> 'trip_type' not in ('family', 'culture', 'nature', 'relaxation', 'custom')
      or nullif(trim(form_data ->> 'destination'), '') is null
      or char_length(trim(form_data ->> 'destination')) > 200 then
      raise exception 'Invalid tourism request' using errcode = '22023';
    end if;
  end if;

  -- A signed-in customer can only submit the phone already verified on their profile.
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

-- M07: replaying the same wallet debit returns the committed order without
-- inserting a second ledger entry or deducting the balance again.
create or replace function public.apply_wallet_to_order(
  p_order_id uuid,
  p_amount numeric,
  p_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  existing_debit public.wallet_transactions;
  available numeric;
  due numeric;
  debit_key text := 'debit:' || coalesce(p_idempotency_key::text, '');
begin
  if auth.uid() is null
    or p_idempotency_key is null
    or p_amount is null
    or p_amount <= 0
    or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid wallet payment' using errcode = '22023';
  end if;

  select * into o
  from public.orders
  where id = p_order_id and customer_id = auth.uid()
  for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
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

    return to_jsonb(o) - 'admin_note' - 'idempotency_key';
  end if;

  if o.total_amount is null
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
