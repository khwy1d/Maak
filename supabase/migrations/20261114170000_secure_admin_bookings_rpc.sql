-- Replace the owner-rights admin view with an explicitly authorized RPC.
drop view if exists public.admin_bookings;

create or replace function public.admin_list_bookings()
returns setof public.bookings
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return query
  select *
  from public.bookings
  order by created_at desc
  limit 500;
end;
$function$;

revoke all on function public.admin_list_bookings() from public, anon;
grant execute on function public.admin_list_bookings() to authenticated;
