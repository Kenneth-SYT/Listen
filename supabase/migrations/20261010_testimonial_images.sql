alter table public.testimonials add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'testimonial-images',
  'testimonial-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins upload testimonial images" on storage.objects;
drop policy if exists "Admins update testimonial images" on storage.objects;
drop policy if exists "Admins delete testimonial images" on storage.objects;

create policy "Admins upload testimonial images"
on storage.objects for insert to authenticated
with check (bucket_id = 'testimonial-images' and public.is_admin());

create policy "Admins update testimonial images"
on storage.objects for update to authenticated
using (bucket_id = 'testimonial-images' and public.is_admin())
with check (bucket_id = 'testimonial-images' and public.is_admin());

create policy "Admins delete testimonial images"
on storage.objects for delete to authenticated
using (bucket_id = 'testimonial-images' and public.is_admin());

drop function if exists public.public_testimonials();
create function public.public_testimonials()
returns table (
  id uuid,
  quote text,
  display_name text,
  context text,
  sort_order integer,
  image_path text
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.quote, t.display_name, t.context, t.sort_order, t.image_path
  from public.testimonials t
  where t.published
  order by t.sort_order, t.created_at;
$$;

drop function if exists public.admin_testimonials();
create function public.admin_testimonials()
returns table (
  id uuid,
  quote text,
  display_name text,
  context text,
  sort_order integer,
  image_path text,
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
    select t.id, t.quote, t.display_name, t.context, t.sort_order, t.image_path,
           t.published, t.created_at, t.updated_at
    from public.testimonials t
    order by t.sort_order, t.created_at;
end;
$$;

drop function if exists public.admin_create_testimonial(text, text, text, boolean);
create function public.admin_create_testimonial(
  p_quote text,
  p_display_name text,
  p_context text,
  p_published boolean default true,
  p_image_path text default null
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
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if char_length(trim(coalesce(p_quote, ''))) not between 10 and 600 then raise exception 'Review must be between 10 and 600 characters'; end if;
  if char_length(trim(coalesce(p_display_name, ''))) not between 1 and 100 then raise exception 'Enter a display name'; end if;
  if char_length(trim(coalesce(p_context, ''))) not between 1 and 160 then raise exception 'Enter review context'; end if;

  select coalesce(max(sort_order), 0) + 10 into next_order from public.testimonials;
  insert into public.testimonials(quote, display_name, context, sort_order, image_path, published)
  values (trim(p_quote), trim(p_display_name), trim(p_context), next_order, nullif(trim(p_image_path), ''), coalesce(p_published, true))
  returning id into new_id;

  insert into public.role_audit_log(actor_user_id, action, target_type, target_id, details)
  values (auth.uid(), 'admin.testimonial_created', 'testimonial', new_id::text,
    jsonb_build_object('target_name', trim(p_display_name), 'published', coalesce(p_published, true), 'has_image', p_image_path is not null));
  return new_id;
end;
$$;

drop function if exists public.admin_update_testimonial(uuid, text, text, text, boolean);
create function public.admin_update_testimonial(
  p_id uuid,
  p_quote text,
  p_display_name text,
  p_context text,
  p_published boolean,
  p_image_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if char_length(trim(coalesce(p_quote, ''))) not between 10 and 600 then raise exception 'Review must be between 10 and 600 characters'; end if;
  if char_length(trim(coalesce(p_display_name, ''))) not between 1 and 100 then raise exception 'Enter a display name'; end if;
  if char_length(trim(coalesce(p_context, ''))) not between 1 and 160 then raise exception 'Enter review context'; end if;

  update public.testimonials
  set quote = trim(p_quote), display_name = trim(p_display_name), context = trim(p_context),
      image_path = nullif(trim(p_image_path), ''), published = p_published, updated_at = now()
  where id = p_id;
  if not found then raise exception 'Review not found'; end if;

  insert into public.role_audit_log(actor_user_id, action, target_type, target_id, details)
  values (auth.uid(), 'admin.testimonial_updated', 'testimonial', p_id::text,
    jsonb_build_object('target_name', trim(p_display_name), 'published', p_published, 'has_image', p_image_path is not null));
end;
$$;

revoke all on function public.public_testimonials() from public;
revoke all on function public.admin_testimonials() from public;
revoke all on function public.admin_create_testimonial(text, text, text, boolean, text) from public;
revoke all on function public.admin_update_testimonial(uuid, text, text, text, boolean, text) from public;
grant execute on function public.public_testimonials() to anon, authenticated;
grant execute on function public.admin_testimonials() to authenticated;
grant execute on function public.admin_create_testimonial(text, text, text, boolean, text) to authenticated;
grant execute on function public.admin_update_testimonial(uuid, text, text, text, boolean, text) to authenticated;
