create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null check (char_length(trim(quote)) between 10 and 600),
  display_name text not null check (char_length(trim(display_name)) between 1 and 100),
  context text not null default 'Student' check (char_length(trim(context)) between 1 and 160),
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;
revoke all on table public.testimonials from anon, authenticated;

insert into public.testimonials (quote, display_name, context, sort_order, published)
select seed.quote, 'Example student story', 'Illustrative quote · not a real review', seed.sort_order, true
from (values
  ('It helped to have a little space to talk through everything on my mind.', 10),
  ('I liked being able to start at my own pace, without needing all the right words.', 20),
  ('Having someone listen made a busy week feel a little less lonely.', 30),
  ('Talking things through helped me think about what I wanted to do next.', 40)
) as seed(quote, sort_order)
where not exists (select 1 from public.testimonials);

create or replace function public.public_testimonials()
returns table (
  id uuid,
  quote text,
  display_name text,
  context text,
  sort_order integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.quote, t.display_name, t.context, t.sort_order
  from public.testimonials t
  where t.published
  order by t.sort_order, t.created_at;
$$;

create or replace function public.admin_testimonials()
returns table (
  id uuid,
  quote text,
  display_name text,
  context text,
  sort_order integer,
  published boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  return query
    select t.id, t.quote, t.display_name, t.context, t.sort_order, t.published, t.created_at, t.updated_at
    from public.testimonials t
    order by t.sort_order, t.created_at;
end;
$$;

create or replace function public.admin_create_testimonial(
  p_quote text,
  p_display_name text,
  p_context text,
  p_published boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  next_order integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if char_length(trim(coalesce(p_quote, ''))) not between 10 and 600 then
    raise exception 'Review must be between 10 and 600 characters';
  end if;
  if char_length(trim(coalesce(p_display_name, ''))) not between 1 and 100 then
    raise exception 'Enter a display name';
  end if;
  if char_length(trim(coalesce(p_context, ''))) not between 1 and 160 then
    raise exception 'Enter review context';
  end if;

  select coalesce(max(sort_order), 0) + 10 into next_order from public.testimonials;
  insert into public.testimonials(quote, display_name, context, sort_order, published)
  values (trim(p_quote), trim(p_display_name), trim(p_context), next_order, coalesce(p_published, true))
  returning id into new_id;

  insert into public.role_audit_log(actor_user_id, action, target_type, target_id, details)
  values (auth.uid(), 'admin.testimonial_created', 'testimonial', new_id::text,
    jsonb_build_object('target_name', trim(p_display_name), 'published', coalesce(p_published, true)));
  return new_id;
end;
$$;

create or replace function public.admin_update_testimonial(
  p_id uuid,
  p_quote text,
  p_display_name text,
  p_context text,
  p_published boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  if char_length(trim(coalesce(p_quote, ''))) not between 10 and 600 then
    raise exception 'Review must be between 10 and 600 characters';
  end if;
  if char_length(trim(coalesce(p_display_name, ''))) not between 1 and 100 then
    raise exception 'Enter a display name';
  end if;
  if char_length(trim(coalesce(p_context, ''))) not between 1 and 160 then
    raise exception 'Enter review context';
  end if;

  update public.testimonials
  set quote = trim(p_quote), display_name = trim(p_display_name), context = trim(p_context),
      published = p_published, updated_at = now()
  where id = p_id;
  if not found then raise exception 'Review not found'; end if;

  insert into public.role_audit_log(actor_user_id, action, target_type, target_id, details)
  values (auth.uid(), 'admin.testimonial_updated', 'testimonial', p_id::text,
    jsonb_build_object('target_name', trim(p_display_name), 'published', p_published));
end;
$$;

create or replace function public.admin_delete_testimonial(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_name text;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;
  delete from public.testimonials where id = p_id returning display_name into removed_name;
  if not found then raise exception 'Review not found'; end if;

  insert into public.role_audit_log(actor_user_id, action, target_type, target_id, details)
  values (auth.uid(), 'admin.testimonial_deleted', 'testimonial', p_id::text,
    jsonb_build_object('target_name', removed_name));
end;
$$;

revoke all on function public.public_testimonials() from public;
revoke all on function public.admin_testimonials() from public;
revoke all on function public.admin_create_testimonial(text, text, text, boolean) from public;
revoke all on function public.admin_update_testimonial(uuid, text, text, text, boolean) from public;
revoke all on function public.admin_delete_testimonial(uuid) from public;

grant execute on function public.public_testimonials() to anon, authenticated;
grant execute on function public.admin_testimonials() to authenticated;
grant execute on function public.admin_create_testimonial(text, text, text, boolean) to authenticated;
grant execute on function public.admin_update_testimonial(uuid, text, text, text, boolean) to authenticated;
grant execute on function public.admin_delete_testimonial(uuid) to authenticated;
