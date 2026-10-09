-- Keep an immutable display snapshot on every audit entry while retaining the
-- Supabase user UUID as the authoritative identity link.
create or replace function public.enrich_role_audit_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_name text;
  actor_email text;
  target_name text;
  target_email text;
  target_user_id uuid;
  target_listener_id uuid;
begin
  if new.actor_user_id is not null then
    select
      coalesce(
        case when nullif(trim(p.preferred_name), '') is not null
          then trim(concat_ws(' ', p.preferred_name, p.last_name)) end,
        nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
        split_part(u.email, '@', 1),
        'Unknown user'
      ),
      u.email
    into actor_name, actor_email
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = new.actor_user_id;
  end if;

  if new.target_type = 'user'
    and new.target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    target_user_id := new.target_id::uuid;
  elsif new.target_type = 'listener'
    and new.target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    target_listener_id := new.target_id::uuid;
  elsif new.target_type in ('availability', 'availability_window') then
    if coalesce(new.details ->> 'listener_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      target_listener_id := (new.details ->> 'listener_id')::uuid;
    elsif new.target_type = 'availability' then
      select listener_id into target_listener_id
      from public.availability
      where id::text = new.target_id;
    else
      select listener_id into target_listener_id
      from public.availability_windows
      where id::text = new.target_id;
    end if;

    -- Deleted listener availability is no longer queryable, but its owner can
    -- still be recovered from the listener account performing the action.
    if target_listener_id is null and new.actor_user_id is not null then
      select listener_id into target_listener_id
      from public.listener_accounts
      where user_id = new.actor_user_id
      limit 1;
    end if;
  end if;

  if target_user_id is not null then
    select
      coalesce(
        case when nullif(trim(p.preferred_name), '') is not null
          then trim(concat_ws(' ', p.preferred_name, p.last_name)) end,
        nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
        split_part(u.email, '@', 1),
        'Unknown user'
      ),
      u.email
    into target_name, target_email
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = target_user_id;
  elsif target_listener_id is not null then
    select l.name, u.email
    into target_name, target_email
    from public.listeners l
    left join public.listener_accounts la on la.listener_id = l.id
    left join auth.users u on u.id = coalesce(l.assigned_user_id, la.user_id)
    where l.id = target_listener_id
    limit 1;
  end if;

  new.details := jsonb_strip_nulls(
    coalesce(new.details, '{}'::jsonb) ||
    jsonb_build_object(
      'actor_name', actor_name,
      'actor_email', actor_email,
      'target_name', target_name,
      'target_email', target_email,
      'listener_id', target_listener_id
    )
  );
  return new;
end;
$$;

drop trigger if exists enrich_role_audit_identity on public.role_audit_log;
create trigger enrich_role_audit_identity
before insert on public.role_audit_log
for each row execute function public.enrich_role_audit_identity();

revoke all on function public.enrich_role_audit_identity() from public, anon, authenticated;

create or replace function public.admin_create_availability(
  p_listener uuid,
  p_starts timestamptz,
  p_ends timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_slot uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if not exists (select 1 from public.listeners where id = p_listener) then
    raise exception 'Unknown listener';
  end if;
  if p_starts <= now() or p_ends <= p_starts then
    raise exception 'Choose a future start and a later end time';
  end if;
  if exists (
    select 1 from public.availability
    where listener_id = p_listener
      and enabled
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts, p_ends, '[)')
  ) then
    raise exception 'That time overlaps existing availability';
  end if;

  insert into public.availability(listener_id, starts_at, ends_at)
  values (p_listener, p_starts, p_ends)
  returning id into new_slot;

  insert into public.role_audit_log(actor_user_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'admin.availability_created',
    'availability',
    new_slot::text,
    jsonb_build_object('listener_id', p_listener, 'starts_at', p_starts, 'ends_at', p_ends, 'enabled', true)
  );
  return new_slot;
end;
$$;

create or replace function public.admin_set_availability(
  p_slot uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.availability;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  select * into target
  from public.availability
  where id = p_slot
  for update;
  if not found then
    raise exception 'Availability not found';
  end if;
  if target.enabled = p_enabled then
    return;
  end if;

  update public.availability set enabled = p_enabled where id = p_slot;
  insert into public.role_audit_log(actor_user_id, action, target_type, target_id, details)
  values (
    auth.uid(),
    'admin.availability_changed',
    'availability',
    p_slot::text,
    jsonb_build_object(
      'listener_id', target.listener_id,
      'starts_at', target.starts_at,
      'ends_at', target.ends_at,
      'previous_enabled', target.enabled,
      'enabled', p_enabled
    )
  );
end;
$$;

create or replace function public.admin_set_availability_range(
  p_listener uuid,
  p_slots uuid[],
  p_enabled boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if coalesce(cardinality(p_slots), 0) = 0 then
    raise exception 'Choose at least one published time';
  end if;
  if exists (
    select 1 from unnest(p_slots) as requested(slot_id)
    where not exists (
      select 1 from public.availability a
      where a.id = slot_id and a.listener_id = p_listener
    )
  ) then
    raise exception 'One or more availability records do not belong to this listener';
  end if;

  update public.availability
  set enabled = p_enabled
  where listener_id = p_listener
    and id = any(p_slots)
    and enabled is distinct from p_enabled;
  get diagnostics changed_count = row_count;

  if changed_count > 0 then
    insert into public.role_audit_log(actor_user_id, action, target_type, target_id, details)
    values (
      auth.uid(),
      'admin.availability_bulk_changed',
      'listener',
      p_listener::text,
      jsonb_build_object('listener_id', p_listener, 'times_changed', changed_count, 'enabled', p_enabled)
    );
  end if;
  return changed_count;
end;
$$;

revoke all on function public.admin_create_availability(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.admin_set_availability(uuid, boolean) from public, anon;
revoke all on function public.admin_set_availability_range(uuid, uuid[], boolean) from public, anon;
grant execute on function public.admin_create_availability(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.admin_set_availability(uuid, boolean) to authenticated;
grant execute on function public.admin_set_availability_range(uuid, uuid[], boolean) to authenticated;
