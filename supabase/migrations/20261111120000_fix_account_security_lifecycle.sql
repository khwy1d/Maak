-- Security and lifecycle fixes for the MAAK account, referral and wallet flows.
-- Password policy is intentionally unchanged. Phone authentication remains phone-only.

-- M02: accept E.164 numbers for every country, not only Yemen.
create or replace function public.normalize_auth_phone()
returns trigger
language plpgsql set search_path = '' as $$
declare
  phone_value text := regexp_replace(coalesce(new.phone, ''), '[^0-9+]', '', 'g');
begin
  if phone_value ~ '^\+[1-9][0-9]{6,14}$' then
    new.phone := phone_value;
  elsif phone_value ~ '^00[1-9][0-9]{6,14}$' then
    new.phone := '+' || substr(phone_value, 3);
  elsif phone_value ~ '^[1-9][0-9]{6,14}$' then
    new.phone := '+' || phone_value;
  else
    raise exception 'A valid international phone number is required' using errcode = '22023';
  end if;
  return new;
end;
$$;

-- M03: referrals must belong to an account whose phone has been confirmed.
-- Remove legacy guest-phone referrals and unconfirmed sign-up referrals; confirmed
-- account referrals are retained and future confirmations are attached by auth.users triggers.
delete from public.referrals r
where r.referred_user_id is null
   or exists (
     select 1 from auth.users u
     where u.id = r.referred_user_id and u.phone_confirmed_at is null
   );

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  normalized_phone text := regexp_replace(coalesce(new.phone, ''), '[^0-9+]', '', 'g');
begin
  if normalized_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'A valid international phone number is required' using errcode = '22023';
  end if;

  insert into public.profiles(id, full_name, phone, referral_code)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'MAAK customer'),
    normalized_phone,
    public.new_referral_code()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.attach_confirmed_referral()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  code text := nullif(upper(trim(new.raw_user_meta_data ->> 'referral_code')), '');
  owner_id uuid;
begin
  if new.phone_confirmed_at is null or code is null then
    return new;
  end if;

  if exists (select 1 from public.referrals where referred_user_id = new.id) then
    return new;
  end if;

  select p.id into owner_id
  from public.profiles p
  where p.referral_code = code and p.id <> new.id;

  if owner_id is not null then
    insert into public.referrals(referrer_id, referred_user_id, referred_phone, referral_code)
    values (owner_id, new.id, new.phone, code)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists zz_attach_confirmed_referral_after_insert on auth.users;
create trigger zz_attach_confirmed_referral_after_insert
after insert on auth.users
for each row execute function public.attach_confirmed_referral();

drop trigger if exists zz_attach_confirmed_referral_after_confirmation on auth.users;
create trigger zz_attach_confirmed_referral_after_confirmation
after update of phone_confirmed_at on auth.users
for each row
when (new.phone_confirmed_at is not null and old.phone_confirmed_at is null)
execute function public.attach_confirmed_referral();

revoke all on function public.attach_confirmed_referral() from public, anon, authenticated;

create or replace function public.reward_qualified_referral()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  ref public.referrals;
  reward numeric;
  currency_code text;
  earlier_qualifying boolean;
begin
  -- Guest orders and phone-text matches can never earn referral commissions.
  if new.customer_id is null
     or new.payment_status <> 'paid'
     or new.status <> 'completed'
     or not exists (
       select 1 from auth.users u
       where u.id = new.customer_id and u.phone_confirmed_at is not null
     ) then
    return new;
  end if;

  select * into ref
  from public.referrals
  where referred_user_id = new.customer_id
  order by created_at
  limit 1;

  if not found or ref.referrer_id = new.customer_id then
    return new;
  end if;

  select exists (
    select 1 from public.orders
    where customer_id = new.customer_id
      and id <> new.id
      and payment_status = 'paid'
      and status = 'completed'
      and created_at < new.created_at
  ) into earlier_qualifying;

  if earlier_qualifying then
    return new;
  end if;

  select (value ->> 'amount')::numeric, value ->> 'currency'
  into reward, currency_code
  from public.app_settings
  where key = 'referral_commission';

  if coalesce(reward, 0) <= 0 then
    return new;
  end if;

  perform 1 from public.profiles where id = ref.referrer_id for update;

  insert into public.wallet_transactions(
    user_id, amount, kind, description, order_id, referral_id, idempotency_key
  )
  values (
    ref.referrer_id, reward, 'commission', 'Referral commission',
    new.id, ref.id, 'referral:' || ref.id::text
  )
  on conflict (idempotency_key) do nothing;

  if found then
    update public.referrals set status = 'rewarded' where id = ref.id;
    insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
    values (
      auth.uid(), 'referral.rewarded', 'referral', ref.id::text,
      jsonb_build_object('amount', reward, 'currency', currency_code, 'order_id', new.id)
    );
  end if;

  return new;
end;
$$;

-- M04: remove table-wide order reads. The customer-facing order shape never
-- includes admin_note or the private idempotency key.
revoke all on public.orders from anon, authenticated;
grant select (
  id, customer_id, customer_name, customer_phone, service, request_data,
  referral_code, status, payment_status, total_amount, wallet_used, currency,
  created_at, updated_at
) on public.orders to authenticated;

-- RPC responses must not serialize the full orders row to non-admin callers.
drop function if exists public.create_order(uuid, text, text, text, jsonb, text);
create function public.create_order(
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
  phone_value text := regexp_replace(trim(p_customer_phone), '[^0-9+]', '', 'g');
begin
  if p_idempotency_key is null
    or char_length(trim(p_customer_name)) not between 1 and 120
    or char_length(phone_value) not between 7 and 18
    or char_length(trim(p_service)) not between 1 and 80
    or jsonb_typeof(p_request_data) <> 'object'
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
      and customer_phone = phone_value;

    if not found then
      raise exception 'Idempotency key belongs to a different customer' using errcode = '42501';
    end if;
  end if;

  return to_jsonb(created) - 'admin_note' - 'idempotency_key';
end;
$$;

drop function if exists public.apply_wallet_to_order(uuid, numeric, uuid);
create function public.apply_wallet_to_order(
  p_order_id uuid,
  p_amount numeric,
  p_idempotency_key uuid
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  available numeric;
  due numeric;
begin
  if auth.uid() is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid wallet payment' using errcode = '22023';
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
    p_order_id, 'debit:' || p_idempotency_key::text
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

-- M05: terminal orders cannot be reopened. This makes a single refund ledger
-- key sufficient and prevents a second debit/refund cycle on the same order.
create or replace function public.admin_update_order(
  p_order_id uuid,
  p_status public.order_status,
  p_payment_status public.payment_status,
  p_total_amount numeric default null,
  p_admin_note text default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if o.status = 'cancelled' and p_status <> 'cancelled' then
    raise exception 'Cancelled orders are terminal and cannot be reopened' using errcode = '22023';
  end if;
  if o.payment_status = 'refunded' and p_payment_status <> 'refunded' then
    raise exception 'Refunded orders are terminal and cannot be reopened' using errcode = '22023';
  end if;
  if p_total_amount is not null and (p_total_amount < o.wallet_used or p_total_amount < 0) then
    raise exception 'Order total cannot be below wallet amount already applied' using errcode = '22023';
  end if;

  update public.orders
  set status = p_status,
      payment_status = p_payment_status,
      total_amount = coalesce(p_total_amount, total_amount),
      admin_note = coalesce(p_admin_note, admin_note),
      updated_at = now()
  where id = p_order_id
  returning * into o;

  insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
  values (
    auth.uid(), 'order.updated', 'order', p_order_id::text,
    jsonb_build_object(
      'status', p_status,
      'payment_status', p_payment_status,
      'total_amount', o.total_amount
    )
  );

  return o;
end;
$$;

create or replace function public.refund_wallet_on_order_refund()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  outstanding numeric;
begin
  if (new.payment_status <> 'refunded' and new.status <> 'cancelled')
    or new.customer_id is null then
    return new;
  end if;

  perform 1 from public.profiles where id = new.customer_id for update;

  select greatest(
    coalesce(-sum(amount) filter (where kind = 'booking_debit'), 0)
      - coalesce(sum(amount) filter (where kind = 'refund'), 0),
    0
  )
  into outstanding
  from public.wallet_transactions
  where order_id = new.id;

  if outstanding <= 0 then
    return new;
  end if;

  insert into public.wallet_transactions(
    user_id, amount, kind, description, order_id, idempotency_key
  )
  values (
    new.customer_id, outstanding, 'refund',
    'Unrefunded wallet amount returned for booking',
    new.id, 'wallet-refund-final:' || new.id::text
  )
  on conflict (idempotency_key) do nothing;

  if found then
    insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
    values (
      auth.uid(), 'wallet.booking_refunded', 'order', new.id::text,
      jsonb_build_object('wallet_amount', outstanding)
    );
  end if;

  return new;
end;
$$;

-- Settle any legacy net wallet debit left on an order that was already cancelled
-- or refunded before this migration. The distinct key avoids collision with the
-- former one-refund-per-order key.
with inserted_refunds as (
  insert into public.wallet_transactions(
    user_id, amount, kind, description, order_id, idempotency_key
  )
  select
    o.customer_id,
    outstanding.net_amount,
    'refund',
    'Legacy outstanding wallet amount settled during lifecycle migration',
    o.id,
    'wallet-refund-final:' || o.id::text
  from public.orders o
  cross join lateral (
    select greatest(
      coalesce(-sum(w.amount) filter (where w.kind = 'booking_debit'), 0)
        - coalesce(sum(w.amount) filter (where w.kind = 'refund'), 0),
      0
    ) as net_amount
    from public.wallet_transactions w
    where w.order_id = o.id
  ) outstanding
  where (o.status = 'cancelled' or o.payment_status = 'refunded')
    and o.customer_id is not null
    and outstanding.net_amount > 0
  on conflict (idempotency_key) do nothing
  returning user_id, order_id, amount
)
insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
select
  null,
  'wallet.legacy_refund_settled',
  'order',
  order_id::text,
  jsonb_build_object('user_id', user_id, 'wallet_amount', amount)
from inserted_refunds;

-- Restore only the intended RPC grants after replacing their return types.
revoke all on function public.create_order(uuid, text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.apply_wallet_to_order(uuid, numeric, uuid) from public, anon, authenticated;
grant execute on function public.create_order(uuid, text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.apply_wallet_to_order(uuid, numeric, uuid) to authenticated;