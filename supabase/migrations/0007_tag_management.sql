-- Lets a signed-in user manage the primary/style tag taxonomy from the
-- app itself (previously SQL-only, seeded via 0002_seed_taxonomy.sql).
-- Same shared-taxonomy caveat as ingredients (0004_ingredient_management.
-- sql): no owner_id, one list for every account -- appropriate for a
-- personal app with one real user.
--
-- Scoped to type in ('primary', 'style') specifically, not a blanket
-- "authenticated can write any tag" policy -- the existing
-- tags_insert_own_custom / tags_update_own_custom / tags_delete_own_custom
-- policies (0001_init.sql) already govern custom tags by ownership, and
-- Postgres RLS OR-combines multiple permissive policies for the same
-- command, so a broader policy here would silently widen those too.
--
-- Deleting a primary/style tag is destructive to its cocktail_tags rows
-- (tag_id references tags(id) ON DELETE CASCADE, no ON DELETE SET NULL
-- fallback the way ingredients has) -- every cocktail tagged with it
-- loses that tag entirely. The app's delete confirmation says so
-- explicitly rather than presenting it as the same low-stakes action
-- ingredient deletion is.

create policy "tags_insert_primary_style" on public.tags
  for insert with check (
    type in ('primary', 'style') and owner_id is null
  );

create policy "tags_update_primary_style" on public.tags
  for update using (type in ('primary', 'style'));

create policy "tags_delete_primary_style" on public.tags
  for delete using (type in ('primary', 'style'));
