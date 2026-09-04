-- Cocktail photo storage — PRD §6.5 (photo upload), §10 (object storage +
-- DB references only), §11 (validate/size-limit uploads).
--
-- Public bucket, but every object path starts with the owning user's id
-- as a folder segment (owner_id/cocktail_id/filename), which is what the
-- write policies below check. A public bucket means anyone with the exact
-- URL can view an image without signing in — acceptable here since object
-- keys are unguessable (uuid-based), the same trust model most
-- user-generated-content storage uses. Write access (insert/update/
-- delete) is fully RLS-scoped to the owner regardless of the public flag.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cocktail-photos',
  'cocktail-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "cocktail_photos_select_own"
  on storage.objects for select
  using (
    bucket_id = 'cocktail-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "cocktail_photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'cocktail-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "cocktail_photos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'cocktail-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "cocktail_photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'cocktail-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
