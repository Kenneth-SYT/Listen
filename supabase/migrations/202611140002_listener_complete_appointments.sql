alter table public.appointments
  add column if not exists completed_at timestamptz;

create or replace function public.listener_complete_appointment(p_appointment uuid)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  booking public.appointments;
begin
  select a.* into booking
  from public.appointments a
  where a.id = p_appointment
  for update;

  if booking.id is null then
    raise exception 'Appointment not found';
  end if;
  if booking.status <> 'confirmed' then
    raise exception 'Only confirmed appointments can be completed';
  end if;
  if booking.completed_at is not null then
    return booking;
  end if;
  if booking.ends_at > now() then
    raise exception 'This appointment can only be completed after its scheduled end time';
  end if;
  if not exists (
    select 1 from public.listener_accounts la
    where la.listener_id = booking.listener_id
      and la.user_id = auth.uid()
  ) then
    raise exception 'You do not have permission to complete this appointment';
  end if;

  update public.appointments
  set completed_at = now()
  where id = booking.id
  returning * into booking;

  return booking;
end;
$$;

revoke all on function public.listener_complete_appointment(uuid) from public, anon;
grant execute on function public.listener_complete_appointment(uuid) to authenticated;
