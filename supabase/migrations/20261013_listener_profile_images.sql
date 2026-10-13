insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listener-images',
  'listener-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins upload listener images" on storage.objects;
drop policy if exists "Admins update listener images" on storage.objects;
drop policy if exists "Admins delete listener images" on storage.objects;

create policy "Admins upload listener images"
on storage.objects for insert to authenticated
with check (bucket_id = 'listener-images' and public.is_admin());

create policy "Admins update listener images"
on storage.objects for update to authenticated
using (bucket_id = 'listener-images' and public.is_admin())
with check (bucket_id = 'listener-images' and public.is_admin());

create policy "Admins delete listener images"
on storage.objects for delete to authenticated
using (bucket_id = 'listener-images' and public.is_admin());
