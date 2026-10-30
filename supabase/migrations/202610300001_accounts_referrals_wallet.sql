create extension if not exists pgcrypto;

create type public.order_status as enum ('requested', 'quoted', 'in_progress', 'completed', 'cancelled');
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');
create type public.wallet_entry_kind as enum ('commission', 'booking_debit', 'adjustment', 'refund');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  phone text not null unique,
  referral_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id)
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id),
  referred_user_id uuid unique references public.profiles(id),
  referred_phone text unique,
  referral_code text not null,
  status text not null default 'registered' check (status in ('registered', 'qualified', 'rewarded')),
  created_at timestamptz not null default now(),
  check (referred_user_id is not null or referred_phone is not null),
  check (referred_user_id is null or referred_user_id <> referrer_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  customer_id uuid references public.profiles(id),
  customer_name text not null check (char_length(trim(customer_name)) between 1 and 120),
  customer_phone text not null,
  service text not null check (char_length(service) between 1 and 80),
  request_data jsonb not null default '{}'::jsonb,
  referral_code text,
  status public.order_status not null default 'requested',
  payment_status public.payment_status not null default 'unpaid',
  total_amount numeric(12,2) check (total_amount is null or total_amount >= 0),
  wallet_used numeric(12,2) not null default 0 check (wallet_used >= 0),
  currency text not null default 'YER' check (currency ~ '^[A-Z]{3}$'),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  amount numeric(12,2) not null check (amount <> 0),
  kind public.wallet_entry_kind not null,
  description text not null,
  order_id uuid references public.orders(id),
  referral_id uuid references public.referrals(id),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.app_settings(key, value) values ('referral_commission', '{"amount":0,"currency":"YER"}'::jsonb);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create function public.audit_profile_admin_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin() and (old.full_name is distinct from new.full_name or old.phone is distinct from new.phone) then
    insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'customer.profile_updated', 'profile', new.id::text,
      jsonb_build_object('full_name', new.full_name, 'phone', new.phone));
  end if;
  return new;
end;
$$;
create trigger profile_admin_update_audit after update on public.profiles
for each row execute function public.audit_profile_admin_update();

create function public.audit_role_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'admin.role_revoked', 'user_role', old.user_id::text, jsonb_build_object('role', old.role));
    return old;
  end if;
  insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'admin.role_granted', 'user_role', new.user_id::text, jsonb_build_object('role', new.role));
  return new;
end;
$$;
create trigger user_role_audit after insert or update or delete on public.user_roles
for each row execute function public.audit_role_change();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;

create function public.new_referral_code() returns text
language plpgsql volatile set search_path = '' as $$
declare code text;
begin
  loop
    code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  code text := nullif(upper(trim(new.raw_user_meta_data ->> 'referral_code')), '');
  owner_id uuid;
  normalized_phone text := regexp_replace(coalesce(new.phone, ''), '[^0-9+]', '', 'g');
begin
  if normalized_phone !~ '^\+[1-9][0-9]{6,14}$' then
    raise exception 'A valid international phone number is required' using errcode = '22023';
  end if;
  insert into public.profiles(id, full_name, phone, referral_code)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'MAAK customer'), normalized_phone, public.new_referral_code());

  if code is not null then
    select id into owner_id from public.profiles where referral_code = code and id <> new.id;
    if owner_id is not null then
      insert into public.referrals(referrer_id, referred_user_id, referred_phone, referral_code)
      values (owner_id, new.id, normalized_phone, code)
      on conflict do nothing;
    end if;
  end if;
  -- Guest orders are intentionally not auto-linked by phone: the phone entered
  -- in a guest form is unverified and must not grant access to another user's data.
  -- Referrals are attached only during verified phone sign-up via auth metadata.
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create function public.current_wallet_balance(target_user uuid default auth.uid()) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(amount), 0) from public.wallet_transactions
  where user_id = target_user and (target_user = auth.uid() or public.is_admin());
$$;

create function public.create_order(
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
  values (p_idempotency_key, actor, trim(p_customer_name), phone_value, trim(p_service), p_request_data, code_value)
  on conflict (idempotency_key) do nothing
  returning * into created;
  created_new := found;
  if not created_new then
    select * into created from public.orders where idempotency_key = p_idempotency_key
      and customer_id is not distinct from actor and customer_phone = phone_value;
    if not found then raise exception 'Idempotency key belongs to a different customer' using errcode = '42501'; end if;
  end if;

  -- Referral attribution is created by handle_new_user() only after phone
  -- verification. A guest-entered phone number is not proof of ownership.
  return created;
end;
$$;

create function public.apply_wallet_to_order(p_order_id uuid, p_amount numeric, p_idempotency_key uuid)
returns public.orders
language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  available numeric;
  due numeric;
begin
  if auth.uid() is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Invalid wallet payment' using errcode = '22023';
  end if;
  select * into o from public.orders where id = p_order_id and customer_id = auth.uid() for update;
  if not found or o.total_amount is null or o.payment_status <> 'unpaid' or o.status in ('completed', 'cancelled') then
    raise exception 'Order cannot accept wallet payment' using errcode = '22023';
  end if;
  perform 1 from public.profiles where id = auth.uid() for update;
  due := greatest(o.total_amount - o.wallet_used, 0);
  available := public.current_wallet_balance(auth.uid());
  if p_amount > due or p_amount > available then
    raise exception 'Insufficient balance or amount exceeds due' using errcode = '22023';
  end if;
  insert into public.wallet_transactions(user_id, amount, kind, description, order_id, idempotency_key)
  values (auth.uid(), -p_amount, 'booking_debit', 'Wallet used for booking', p_order_id, 'debit:' || p_idempotency_key::text);
  update public.orders set wallet_used = wallet_used + p_amount, updated_at = now() where id = p_order_id returning * into o;
  if o.wallet_used = o.total_amount then
    update public.orders set payment_status = 'paid', updated_at = now() where id = p_order_id returning * into o;
  end if;
  return o;
end;
$$;

create function public.admin_update_order(
  p_order_id uuid, p_status public.order_status, p_payment_status public.payment_status,
  p_total_amount numeric default null, p_admin_note text default null
) returns public.orders
language plpgsql security definer set search_path = '' as $$
declare o public.orders;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if p_total_amount is not null and (p_total_amount < o.wallet_used or p_total_amount < 0) then
    raise exception 'Order total cannot be below wallet amount already applied' using errcode = '22023';
  end if;
  update public.orders set status = p_status, payment_status = p_payment_status,
    total_amount = coalesce(p_total_amount, total_amount), admin_note = p_admin_note, updated_at = now()
  where id = p_order_id returning * into o;
  insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'order.updated', 'order', p_order_id::text,
    jsonb_build_object('status', p_status, 'payment_status', p_payment_status, 'total_amount', o.total_amount));
  return o;
end;
$$;

create function public.admin_set_commission(p_amount numeric, p_currency text default 'YER') returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_amount is null or p_amount < 0 or p_currency is distinct from 'YER' then raise exception 'Only YER commissions are supported' using errcode = '22023'; end if;
  update public.app_settings set value = jsonb_build_object('amount', p_amount, 'currency', p_currency), updated_at = now(), updated_by = auth.uid()
  where key = 'referral_commission';
  insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'commission.updated', 'setting', 'referral_commission', jsonb_build_object('amount', p_amount, 'currency', p_currency));
  return jsonb_build_object('amount', p_amount, 'currency', p_currency);
end;
$$;

create function public.admin_adjust_wallet(p_user_id uuid, p_amount numeric, p_description text, p_idempotency_key uuid)
returns public.wallet_transactions
language plpgsql security definer set search_path = '' as $$
declare entry public.wallet_transactions;
begin
  if not public.is_admin() then raise exception 'Admin access required' using errcode = '42501'; end if;
  if p_amount is null or p_idempotency_key is null or p_amount = 0 or abs(p_amount) > 100000000
    or p_description is null or char_length(trim(p_description)) not between 3 and 240 then
    raise exception 'Invalid wallet adjustment' using errcode = '22023';
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Customer not found' using errcode = 'P0002'; end if;
  if p_amount < 0 and public.current_wallet_balance(p_user_id) < abs(p_amount) then
    raise exception 'Wallet balance cannot become negative' using errcode = '22023';
  end if;
  insert into public.wallet_transactions(user_id, amount, kind, description, idempotency_key)
  values (p_user_id, p_amount, 'adjustment', trim(p_description), 'adjustment:' || p_idempotency_key::text)
  returning * into entry;
  insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'wallet.adjusted', 'wallet_transaction', entry.id::text,
    jsonb_build_object('user_id', p_user_id, 'amount', p_amount, 'description', p_description));
  return entry;
end;
$$;

create function public.reward_qualified_referral() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  ref public.referrals;
  reward numeric;
  currency_code text;
  earlier_qualifying boolean;
begin
  if new.payment_status <> 'paid' or new.status <> 'completed' then return new; end if;
  select * into ref from public.referrals where referred_user_id = new.customer_id or referred_phone = new.customer_phone order by created_at limit 1;
  if not found or ref.referrer_id = new.customer_id then return new; end if;
  select exists(select 1 from public.orders where ((new.customer_id is not null and customer_id = new.customer_id)
    or (new.customer_id is null and customer_phone = new.customer_phone)) and id <> new.id
    and payment_status = 'paid' and status = 'completed' and created_at < new.created_at) into earlier_qualifying;
  if earlier_qualifying then return new; end if;
  select (value ->> 'amount')::numeric, value ->> 'currency' into reward, currency_code
  from public.app_settings where key = 'referral_commission';
  if coalesce(reward, 0) <= 0 then return new; end if;
  perform 1 from public.profiles where id = ref.referrer_id for update;
  insert into public.wallet_transactions(user_id, amount, kind, description, order_id, referral_id, idempotency_key)
  values (ref.referrer_id, reward, 'commission', 'Referral commission', new.id, ref.id, 'referral:' || ref.id::text)
  on conflict (idempotency_key) do nothing;
  if found then
    update public.referrals set status = 'rewarded' where id = ref.id;
    insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'referral.rewarded', 'referral', ref.id::text, jsonb_build_object('amount', reward, 'currency', currency_code, 'order_id', new.id));
  end if;
  return new;
end;
$$;
create trigger order_qualifies_referral after update of payment_status, status on public.orders
for each row when (new.payment_status = 'paid' and new.status = 'completed') execute function public.reward_qualified_referral();

create function public.refund_wallet_on_order_refund() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.payment_status <> 'refunded' and new.status <> 'cancelled')
    or (old.payment_status = 'refunded' or old.status = 'cancelled') or new.wallet_used <= 0 then return new; end if;
  perform 1 from public.profiles where id = new.customer_id for update;
  insert into public.wallet_transactions(user_id, amount, kind, description, order_id, idempotency_key)
  values (new.customer_id, new.wallet_used, 'refund', 'Wallet portion refunded for booking', new.id, 'wallet-refund:' || new.id::text)
  on conflict (idempotency_key) do nothing;
  if found then
    insert into public.audit_log(actor_id, action, entity_type, entity_id, details)
    values (auth.uid(), 'wallet.booking_refunded', 'order', new.id::text, jsonb_build_object('wallet_amount', new.wallet_used));
  end if;
  return new;
end;
$$;
create trigger order_wallet_refunded after update of payment_status, status on public.orders
for each row when (new.payment_status = 'refunded' or new.status = 'cancelled') execute function public.refund_wallet_on_order_refund();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.referrals enable row level security;
alter table public.orders enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_log enable row level security;

create policy "Customers read own profile; admins read all" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Customers update own name only" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "Admins manage profiles" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "Users see own role" on public.user_roles for select using (user_id = auth.uid() or public.is_admin());
create policy "Users see own referrals" on public.referrals for select using (referrer_id = auth.uid() or referred_user_id = auth.uid() or public.is_admin());
create policy "Customers see own orders; admins see all" on public.orders for select using (customer_id = auth.uid() or public.is_admin());
create policy "Customers see own wallet; admins see all" on public.wallet_transactions for select using (user_id = auth.uid() or public.is_admin());
create policy "Commission setting visible to authenticated users" on public.app_settings for select using (key = 'referral_commission' and auth.uid() is not null or public.is_admin());
create policy "Admins read audit log" on public.audit_log for select using (public.is_admin());

revoke all on public.profiles, public.user_roles, public.referrals, public.orders, public.wallet_transactions, public.app_settings, public.audit_log from anon, authenticated;
revoke all on function public.new_referral_code(), public.handle_new_user(), public.audit_profile_admin_update(), public.audit_role_change(), public.reward_qualified_referral(), public.refund_wallet_on_order_refund() from public, anon, authenticated;
revoke all on function public.is_admin(), public.current_wallet_balance(uuid), public.create_order(uuid,text,text,text,jsonb,text), public.apply_wallet_to_order(uuid,numeric,uuid), public.admin_update_order(uuid,public.order_status,public.payment_status,numeric,text), public.admin_set_commission(numeric,text), public.admin_adjust_wallet(uuid,numeric,text,uuid) from public, anon, authenticated;
grant select on public.profiles, public.user_roles, public.referrals, public.orders, public.wallet_transactions, public.app_settings to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select on public.audit_log to authenticated;
grant execute on function public.is_admin(), public.current_wallet_balance(uuid), public.create_order(uuid,text,text,text,jsonb,text), public.apply_wallet_to_order(uuid,numeric,uuid), public.admin_update_order(uuid,public.order_status,public.payment_status,numeric,text), public.admin_set_commission(numeric,text), public.admin_adjust_wallet(uuid,numeric,text,uuid) to authenticated;
grant execute on function public.create_order(uuid,text,text,text,jsonb,text) to anon;

create index orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index orders_status_payment_idx on public.orders(status, payment_status);
create index wallet_user_created_idx on public.wallet_transactions(user_id, created_at desc);
create index referral_referrer_created_idx on public.referrals(referrer_id, created_at desc);
