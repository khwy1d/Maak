create or replace function public.new_referral_code()
returns text
language plpgsql
set search_path = ''
as $function$
declare
  code text;
begin
  loop
    code := upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 10));
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$function$;
