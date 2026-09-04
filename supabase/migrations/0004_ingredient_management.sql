-- Lets a signed-in user manage the canonical ingredient list from the app
-- itself (previously SQL-only). This table has no owner_id — like the
-- primary/style tags, it's a single shared taxonomy across every account
-- on the app, appropriate for a personal app with one real user; a
-- multi-tenant version of this app would need to revisit that.
--
-- Deleting a canonical ingredient is safe: recipe_ingredients.
-- canonical_ingredient_id is ON DELETE SET NULL, so existing recipes keep
-- their ingredient text, they just lose the canonical link (falls back to
-- free text, same as an ingredient that was never matched).

create policy "ingredients_insert_authenticated" on public.ingredients
  for insert with check ((select auth.role()) = 'authenticated');

create policy "ingredients_update_authenticated" on public.ingredients
  for update using ((select auth.role()) = 'authenticated');

create policy "ingredients_delete_authenticated" on public.ingredients
  for delete using ((select auth.role()) = 'authenticated');
