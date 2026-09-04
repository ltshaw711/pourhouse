-- Pourhouse — initial schema
-- Phase 1: Foundation (PRD §9 data model, §11 security)
-- Ownership is enforced at the database layer via Row-Level Security,
-- not only in application code.

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";       -- fast partial/substring name search

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.normalize_text(input text)
returns text
language sql
immutable
as $$
  select nullif(trim(regexp_replace(lower(coalesce(input, '')), '\s+', ' ', 'g')), '');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.trg_normalize_ingredient()
returns trigger
language plpgsql
as $$
begin
  new.normalized_name = public.normalize_text(new.canonical_name);
  return new;
end;
$$;

create or replace function public.trg_normalize_cocktail()
returns trigger
language plpgsql
as $$
begin
  new.normalized_name = public.normalize_text(new.name);
  return new;
end;
$$;

create or replace function public.trg_normalize_tag()
returns trigger
language plpgsql
as $$
begin
  new.normalized_name = public.normalize_text(new.name);
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles  (extends auth.users — PRD §9 "User")
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update using (id = (select auth.uid()));

-- New auth.users row -> public.profiles row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- ingredients  (canonical taxonomy — PRD §6.4, §9)
-- Shared/global list. Readable by any signed-in user; writes are restricted
-- to the service role (seed data / an admin edge function), matching
-- "selected from a managed canonical list" in the PRD.
-- ---------------------------------------------------------------------------

create table public.ingredients (
  id              uuid primary key default gen_random_uuid(),
  canonical_name  text not null,
  normalized_name text not null,
  category        text,                          -- e.g. gin, bourbon, tequila, non-alcoholic
  aliases         text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (normalized_name)
);

create index ingredients_normalized_name_trgm_idx
  on public.ingredients using gin (normalized_name gin_trgm_ops);
create index ingredients_aliases_idx on public.ingredients using gin (aliases);

create trigger ingredients_set_updated_at
  before update on public.ingredients
  for each row execute function public.set_updated_at();

create trigger ingredients_normalize
  before insert or update on public.ingredients
  for each row execute function public.trg_normalize_ingredient();

alter table public.ingredients enable row level security;

create policy "ingredients_select_authenticated" on public.ingredients
  for select using ((select auth.role()) = 'authenticated');

-- ---------------------------------------------------------------------------
-- tags  (primary / style / custom — PRD §6.4, §9)
-- primary & style tags are global (owner_id null, managed centrally).
-- custom tags belong to one user.
-- ---------------------------------------------------------------------------

create table public.tags (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references auth.users (id) on delete cascade,
  name            text not null,
  normalized_name text not null,
  type            text not null check (type in ('primary', 'style', 'custom')),
  created_at      timestamptz not null default now(),
  constraint tags_custom_needs_owner
    check ((type = 'custom' and owner_id is not null) or (type <> 'custom' and owner_id is null))
);

create index tags_type_idx on public.tags (type);
create index tags_owner_id_idx on public.tags (owner_id);

-- Postgres unique constraints treat NULL <> NULL, so a plain unique() on
-- (owner_id, normalized_name, type) would never block duplicate global tags
-- (owner_id is null for all of them). Two partial indexes instead:
create unique index tags_global_unique_idx
  on public.tags (normalized_name, type) where owner_id is null;
create unique index tags_custom_unique_idx
  on public.tags (owner_id, normalized_name, type) where owner_id is not null;

create trigger tags_normalize
  before insert or update on public.tags
  for each row execute function public.trg_normalize_tag();

alter table public.tags enable row level security;

create policy "tags_select_visible" on public.tags
  for select using (type in ('primary', 'style') or owner_id = (select auth.uid()));

create policy "tags_insert_own_custom" on public.tags
  for insert with check (type = 'custom' and owner_id = (select auth.uid()));

create policy "tags_update_own_custom" on public.tags
  for update using (type = 'custom' and owner_id = (select auth.uid()));

create policy "tags_delete_own_custom" on public.tags
  for delete using (type = 'custom' and owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- cocktails  (PRD §9)
-- ---------------------------------------------------------------------------

create table public.cocktails (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  name            text not null,
  normalized_name text not null,
  description     text,
  instructions    text,
  garnish         text,
  glassware       text,
  source          text,                     -- e.g. 'Apple Notes', 'manual', a URL
  favorite        boolean not null default false,
  photo_url       text,
  status          text not null default 'draft'
                    check (status in ('draft', 'published', 'archived')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index cocktails_owner_id_idx on public.cocktails (owner_id);
create index cocktails_owner_normalized_name_idx
  on public.cocktails (owner_id, normalized_name);
create index cocktails_normalized_name_trgm_idx
  on public.cocktails using gin (normalized_name gin_trgm_ops);
create index cocktails_owner_favorite_idx on public.cocktails (owner_id, favorite);
create index cocktails_owner_status_idx on public.cocktails (owner_id, status);

create trigger cocktails_set_updated_at
  before update on public.cocktails
  for each row execute function public.set_updated_at();

create trigger cocktails_normalize
  before insert or update on public.cocktails
  for each row execute function public.trg_normalize_cocktail();

alter table public.cocktails enable row level security;

create policy "cocktails_select_own" on public.cocktails
  for select using (owner_id = (select auth.uid()));

create policy "cocktails_insert_own" on public.cocktails
  for insert with check (owner_id = (select auth.uid()));

create policy "cocktails_update_own" on public.cocktails
  for update using (owner_id = (select auth.uid()));

create policy "cocktails_delete_own" on public.cocktails
  for delete using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- recipe_ingredients  (PRD §9)
-- Stored separately from cocktails for fast many-to-many ingredient filtering.
-- ---------------------------------------------------------------------------

create table public.recipe_ingredients (
  id                     uuid primary key default gen_random_uuid(),
  cocktail_id            uuid not null references public.cocktails (id) on delete cascade,
  canonical_ingredient_id uuid references public.ingredients (id) on delete set null,
  display_name           text not null,   -- original text; never overwritten by parsing
  amount                 numeric,
  unit                   text,
  qualifier              text,            -- e.g. "fresh", "chilled", "to taste"
  note                   text,
  position               integer not null default 0
);

create index recipe_ingredients_cocktail_id_idx
  on public.recipe_ingredients (cocktail_id);
create index recipe_ingredients_canonical_ingredient_id_idx
  on public.recipe_ingredients (canonical_ingredient_id);

alter table public.recipe_ingredients enable row level security;

create policy "recipe_ingredients_select_own" on public.recipe_ingredients
  for select using (
    exists (select 1 from public.cocktails c
            where c.id = cocktail_id and c.owner_id = (select auth.uid()))
  );

create policy "recipe_ingredients_insert_own" on public.recipe_ingredients
  for insert with check (
    exists (select 1 from public.cocktails c
            where c.id = cocktail_id and c.owner_id = (select auth.uid()))
  );

create policy "recipe_ingredients_update_own" on public.recipe_ingredients
  for update using (
    exists (select 1 from public.cocktails c
            where c.id = cocktail_id and c.owner_id = (select auth.uid()))
  );

create policy "recipe_ingredients_delete_own" on public.recipe_ingredients
  for delete using (
    exists (select 1 from public.cocktails c
            where c.id = cocktail_id and c.owner_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- cocktail_tags  (PRD §9)
-- ---------------------------------------------------------------------------

create table public.cocktail_tags (
  cocktail_id uuid not null references public.cocktails (id) on delete cascade,
  tag_id      uuid not null references public.tags (id) on delete cascade,
  primary key (cocktail_id, tag_id)
);

create index cocktail_tags_tag_id_idx on public.cocktail_tags (tag_id);

alter table public.cocktail_tags enable row level security;

create policy "cocktail_tags_select_own" on public.cocktail_tags
  for select using (
    exists (select 1 from public.cocktails c
            where c.id = cocktail_id and c.owner_id = (select auth.uid()))
  );

create policy "cocktail_tags_insert_own" on public.cocktail_tags
  for insert with check (
    exists (select 1 from public.cocktails c
            where c.id = cocktail_id and c.owner_id = (select auth.uid()))
    and exists (select 1 from public.tags t
                where t.id = tag_id and (t.type in ('primary', 'style') or t.owner_id = (select auth.uid())))
  );

create policy "cocktail_tags_delete_own" on public.cocktail_tags
  for delete using (
    exists (select 1 from public.cocktails c
            where c.id = cocktail_id and c.owner_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- import_batches / import_items  (PRD §6.6, §9)
-- ---------------------------------------------------------------------------

create table public.import_batches (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  source          text not null default 'apple_notes',
  uploaded_at     timestamptz not null default now(),
  status          text not null default 'pending'
                    check (status in ('pending', 'processing', 'completed', 'failed')),
  summary         jsonb not null default '{}'::jsonb,  -- imported/skipped/duplicate/needs_review counts
  retention_expires_at timestamptz not null default (now() + interval '24 hours')
);

create index import_batches_owner_id_idx on public.import_batches (owner_id);

alter table public.import_batches enable row level security;

create policy "import_batches_select_own" on public.import_batches
  for select using (owner_id = (select auth.uid()));

create policy "import_batches_insert_own" on public.import_batches
  for insert with check (owner_id = (select auth.uid()));

create policy "import_batches_update_own" on public.import_batches
  for update using (owner_id = (select auth.uid()));

create policy "import_batches_delete_own" on public.import_batches
  for delete using (owner_id = (select auth.uid()));

create table public.import_items (
  id                  uuid primary key default gen_random_uuid(),
  batch_id            uuid not null references public.import_batches (id) on delete cascade,
  raw_source          text not null,              -- original note text, retained for traceability
  parsed              jsonb not null default '{}'::jsonb,
  confidence          numeric,
  status              text not null default 'needs_review'
                        check (status in
                          ('needs_review', 'approved', 'skipped', 'duplicate', 'imported')),
  matched_cocktail_id uuid references public.cocktails (id) on delete set null,
  created_at          timestamptz not null default now()
);

create index import_items_batch_id_idx on public.import_items (batch_id);
create index import_items_matched_cocktail_id_idx on public.import_items (matched_cocktail_id);

alter table public.import_items enable row level security;

create policy "import_items_select_own" on public.import_items
  for select using (
    exists (select 1 from public.import_batches b
            where b.id = batch_id and b.owner_id = (select auth.uid()))
  );

create policy "import_items_insert_own" on public.import_items
  for insert with check (
    exists (select 1 from public.import_batches b
            where b.id = batch_id and b.owner_id = (select auth.uid()))
  );

create policy "import_items_update_own" on public.import_items
  for update using (
    exists (select 1 from public.import_batches b
            where b.id = batch_id and b.owner_id = (select auth.uid()))
  );

create policy "import_items_delete_own" on public.import_items
  for delete using (
    exists (select 1 from public.import_batches b
            where b.id = batch_id and b.owner_id = (select auth.uid()))
  );
