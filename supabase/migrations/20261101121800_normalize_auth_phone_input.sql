create or replace function public.normalize_auth_phone()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  phone_value text := regexp_replace(coalesce(new.phone, ''), '[^0-9+]', '', 'g');
begin
  if phone_value ~ '^\\+[1-9][0-9]{6,14}$' then
    new.phone := phone_value;
  elsif phone_value ~ '^9677[0-9]{8}$' then
    new.phone := '+' || phone_value;
  elsif phone_value ~ '^0?7[0-9]{8}$' then
    new.phone := '+967' || right(phone_value, 9);
  else
    raise exception 'A valid international phone number is required' using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger on_auth_user_phone_normalized
before insert on auth.users
for each row execute function public.normalize_auth_phone();

revoke all on function public.normalize_auth_phone() from public, anon, authenticated;
