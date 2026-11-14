create or replace function public.notify_staff_new_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce(new.request_data ->> 'internal_booking', 'false') <> 'true' then
    insert into public.staff_notifications(user_id, order_id, title, body)
    select ur.user_id, new.id, 'طلب جديد يحتاج مراجعة',
      'وصل طلب جديد من ' || new.customer_name || ' لخدمة ' || new.service
    from public.user_roles ur
    where ur.role in ('admin', 'staff')
    on conflict (user_id, order_id) do nothing;
  end if;
  return new;
end;
$function$;

revoke all on function public.notify_staff_new_order() from public, anon, authenticated;
