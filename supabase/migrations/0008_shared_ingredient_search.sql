-- Ingredient-on-hand search for the public read-only share view
-- (extends 0005_public_share.sql). Same model as the rest of that
-- migration: no RLS policy grants anon any new table access; two more
-- SECURITY DEFINER functions resolve the token to its owner themselves
-- (via the internal shared_owner_id helper, which stays ungranted) and
-- return only what the search needs, scoped to that owner's published
-- cocktails.
--
-- Exposure is deliberately narrower than "the whole ingredients table":
-- shared_ingredients returns only canonical ingredients that at least
-- one of the owner's published recipes actually uses. An ingredient
-- nobody's recipe needs can't produce a result, so offering it as a chip
-- would be a dead end -- and the global canonical list (shared by every
-- account, no owner_id) never leaves the database. Everything returned
-- is already visible in the recipes themselves.

-- Chips for "What do you have on hand?"
create or replace function public.shared_ingredients(p_token text)
returns table (
  id uuid,
  canonical_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct i.id, i.canonical_name
  from public.recipe_ingredients ri
  join public.cocktails c on c.id = ri.cocktail_id
  join public.ingredients i on i.id = ri.canonical_ingredient_id
  where c.owner_id = public.shared_owner_id(p_token)
    and c.status = 'published'
  order by i.canonical_name;
$$;

grant execute on function public.shared_ingredients(text) to anon, authenticated;

-- Which canonical ingredients each published cocktail needs -- the input
-- to the Make now / Almost classification. Free-text recipe lines with
-- no canonical link are excluded, same as the signed-in Home page.
create or replace function public.shared_recipe_requirements(p_token text)
returns table (
  cocktail_id uuid,
  canonical_ingredient_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct ri.cocktail_id, ri.canonical_ingredient_id
  from public.recipe_ingredients ri
  join public.cocktails c on c.id = ri.cocktail_id
  where ri.canonical_ingredient_id is not null
    and c.owner_id = public.shared_owner_id(p_token)
    and c.status = 'published';
$$;

grant execute on function public.shared_recipe_requirements(text) to anon, authenticated;
