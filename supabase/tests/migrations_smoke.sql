-- Isolated CI smoke tests for the M03-M12 migration chain.
-- Runs only against the disposable local Supabase stack created by GitHub Actions.

do $$
declare
  guest_key uuid := gen_random_uuid();
  guest_payload jsonb := jsonb_build_object(
    'message', 'Maak CI guest idempotency check',
    'form_data', jsonb_build_object('trip_type', 'nature', 'destination', 'CI test')
  );
  guest_first jsonb;
  guest_replay jsonb;
  test_user uuid := gen_random_uuid();
  wallet_key uuid := gen_random_uuid();
  wallet_payload jsonb := jsonb_build_object(
    'message', 'Maak CI wallet idempotency check',
    'form_data', jsonb_build_object('trip_type', 'nature', 'destination', 'CI wallet test')
  );
  wallet_order jsonb;
  debit_first jsonb;
  debit_replay jsonb;
  wallet_order_id uuid;
  debit_count integer;
  wallet_used numeric;
begin
  -- Guest order creation must replay the same row for the same key and payload.
  guest_first := public.create_order(
    guest_key, 'CI Guest', '+967777777771', 'tourism', guest_payload, null
  );
  guest_replay := public.create_order(
    guest_key, 'CI Guest', '+967777777771', 'tourism', guest_payload, null
  );

  if guest_first ->> 'id' is distinct from guest_replay ->> 'id' then
    raise exception 'M07 failure: duplicate guest request created a second order';
  end if;
  if guest_first ? 'admin_note' or guest_first ? 'idempotency_key' then
    raise exception 'M04/M07 failure: private order fields leaked from create_order';
  end if;

  -- Reusing a key for a different payload must be rejected.
  begin
    perform public.create_order(
      guest_key, 'Different Guest', '+967777777771', 'tourism',
      jsonb_build_object(
        'message', 'different payload',
        'form_data', jsonb_build_object('trip_type', 'nature', 'destination', 'Elsewhere')
      ), null
    );
    raise exception 'M07 failure: mismatched idempotency replay was accepted';
  exception
    when sqlstate '22023' then
      null;
  end;

  -- Create a confirmed local Auth user; the migration's auth trigger must
  -- create the matching profile. No production account or data is involved.
  insert into auth.users (
    id, aud, role, phone, phone_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    test_user, 'authenticated', 'authenticated', '+967777777772', now(),
    '{"provider":"phone","providers":["phone"]}'::jsonb,
    '{"full_name":"Maak CI Wallet User"}'::jsonb, now(), now()
  );

  perform set_config('request.jwt.claim.sub', test_user::text, true);

  insert into public.wallet_transactions (
    user_id, amount, kind, description, idempotency_key
  ) values (
    test_user, 100, 'adjustment', 'CI-only wallet seed', 'ci-seed:' || test_user::text
  );

  wallet_order := public.create_order(
    gen_random_uuid(), 'Maak CI Wallet User', '+967777777772',
    'tourism', wallet_payload, null
  );
  wallet_order_id := (wallet_order ->> 'id')::uuid;

  update public.orders
  set total_amount = 50
  where id = wallet_order_id;

  debit_first := public.apply_wallet_to_order(wallet_order_id, 25, wallet_key);
  debit_replay := public.apply_wallet_to_order(wallet_order_id, 25, wallet_key);

  select count(*) into debit_count
  from public.wallet_transactions
  where idempotency_key = 'debit:' || wallet_key::text;

  select o.wallet_used into wallet_used
  from public.orders as o
  where o.id = wallet_order_id;

  if debit_count <> 1 or wallet_used <> 25 then
    raise exception 'M07 failure: wallet retry applied more than one debit';
  end if;
  if debit_first ->> 'id' is distinct from debit_replay ->> 'id' then
    raise exception 'M07 failure: wallet replay returned a different order';
  end if;

  -- Contract and least-privilege checks after both migrations.
  if pg_get_function_result(
    'public.create_order(uuid,text,text,text,jsonb,text)'::regprocedure
  ) <> 'jsonb' then
    raise exception 'M04/M07 failure: create_order return type is not jsonb';
  end if;

  if pg_get_function_result(
    'public.apply_wallet_to_order(uuid,numeric,uuid)'::regprocedure
  ) <> 'jsonb' then
    raise exception 'M07 failure: apply_wallet_to_order return type is not jsonb';
  end if;

  if not has_function_privilege(
    'anon', 'public.create_order(uuid,text,text,text,jsonb,text)', 'EXECUTE'
  ) then
    raise exception 'Guest order submission must remain available to anon';
  end if;

  if has_function_privilege(
    'anon', 'public.apply_wallet_to_order(uuid,numeric,uuid)', 'EXECUTE'
  ) then
    raise exception 'M07 failure: anon can execute the wallet debit RPC';
  end if;
end;
$$;

select 'Maak M03-M12 migration smoke tests passed' as result;
