-- Pourhouse — starter canonical taxonomy (PRD §6.4)
-- Seeds the managed lists so primary-ingredient tagging and ingredient
-- search work immediately. Both tables key off normalized_name/name, so
-- this migration is safe to re-run.

-- ---------------------------------------------------------------------------
-- Primary-ingredient tags
-- ---------------------------------------------------------------------------

insert into public.tags (name, type)
values
  ('Gin', 'primary'),
  ('Vodka', 'primary'),
  ('Bourbon', 'primary'),
  ('Rye Whiskey', 'primary'),
  ('Scotch', 'primary'),
  ('Tequila', 'primary'),
  ('Mezcal', 'primary'),
  ('Rum', 'primary'),
  ('Brandy', 'primary'),
  ('Sparkling Wine', 'primary'),
  ('Non-Alcoholic', 'primary')
on conflict (normalized_name, type) where owner_id is null do nothing;

-- ---------------------------------------------------------------------------
-- Style / flavor tags
-- ---------------------------------------------------------------------------

insert into public.tags (name, type)
values
  ('Citrus', 'style'),
  ('Bitter', 'style'),
  ('Sweet', 'style'),
  ('Herbal', 'style'),
  ('Spicy', 'style'),
  ('Stirred', 'style'),
  ('Shaken', 'style'),
  ('Tropical', 'style'),
  ('Tiki', 'style'),
  ('Aperitif', 'style'),
  ('Digestif', 'style'),
  ('Classic', 'style'),
  ('Low-ABV', 'style'),
  ('Effervescent', 'style')
on conflict (normalized_name, type) where owner_id is null do nothing;

-- ---------------------------------------------------------------------------
-- Canonical ingredients — enough of a base list to unblock import/search;
-- expand via an admin flow rather than migrations as the collection grows.
-- ---------------------------------------------------------------------------

insert into public.ingredients (canonical_name, category, aliases)
values
  ('Gin', 'gin', array['london dry gin']),
  ('Vodka', 'vodka', array[]::text[]),
  ('Bourbon Whiskey', 'bourbon', array['bourbon']),
  ('Rye Whiskey', 'rye whiskey', array['rye']),
  ('Blended Scotch Whisky', 'scotch', array['scotch', 'scotch whisky']),
  ('Blanco Tequila', 'tequila', array['tequila', 'silver tequila']),
  ('Reposado Tequila', 'tequila', array['reposado']),
  ('Mezcal', 'mezcal', array[]::text[]),
  ('White Rum', 'rum', array['light rum', 'silver rum']),
  ('Dark Rum', 'rum', array['aged rum']),
  ('Cognac', 'brandy', array['brandy']),
  ('Champagne', 'sparkling wine', array['prosecco', 'sparkling wine', 'cava']),
  ('Dry Vermouth', null, array['dry vermouth']),
  ('Sweet Vermouth', null, array['sweet vermouth', 'red vermouth']),
  ('Campari', null, array[]::text[]),
  ('Aperol', null, array[]::text[]),
  ('Angostura Bitters', null, array['bitters']),
  ('Orange Liqueur', null, array['triple sec', 'cointreau', 'curacao']),
  ('Simple Syrup', null, array['sugar syrup']),
  ('Fresh Lime Juice', null, array['lime juice', 'fresh lime']),
  ('Fresh Lemon Juice', null, array['lemon juice', 'fresh lemon']),
  ('Club Soda', 'non-alcoholic', array['soda water', 'sparkling water']),
  ('Ginger Beer', 'non-alcoholic', array[]::text[])
on conflict (normalized_name) do nothing;
