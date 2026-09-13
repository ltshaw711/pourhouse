-- Public read-only share link (code-only feature, no PRD section — added
-- per user request): a single per-account link that lets anyone who has
-- the URL browse the owner's whole (published) library without signing
-- in, and that the owner can regenerate or turn off from Settings.
--
-- No new RLS policy grants the anon role direct table access — every
-- existing table stays exactly as locked down as before. Instead, a
-- small set of SECURITY DEFINER functions do the token/owner check
-- themselves and hand back only the read-only fields a shared view
-- needs. Only these functions get EXECUTE for anon/authenticated; the
-- token-resolution helper stays internal.

alter table public.profiles
  add column share_token text unique;

create index profiles_share_token_idx
  on public.profiles (share_token) where share_token is not null;

-- Internal only (not granted below): resolves a token to its owner, or
-- null if unset/revoked. Every public-facing function calls this itself
-- rather than trusting a caller-supplied owner id.
create or replace function public.shared_owner_id(p_token text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles
  where share_token = p_token and p_token is not null;
$$;

revoke execute on function public.shared_owner_id(text) from public;

-- Display name for the shared view's header.
create or replace function public.shared_owner_name(p_token text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(display_name, split_part(email, '@', 1))
  from public.profiles
  where id = public.shared_owner_id(p_token);
$$;

grant execute on function public.shared_owner_name(text) to anon, authenticated;

-- Library list: every published cocktail for the token's owner.
create or replace function public.shared_cocktails(p_token text)
returns table (
  id uuid,
  name text,
  photo_url text,
  favorite boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.photo_url, c.favorite
  from public.cocktails c
  where c.owner_id = public.shared_owner_id(p_token)
    and c.status = 'published'
  order by c.created_at desc;
$$;

grant execute on function public.shared_cocktails(text) to anon, authenticated;

-- Tags for every shared cocktail at once — same batched shape as the
-- signed-in getTagsByCocktail() helper, just token-scoped instead of
-- RLS-scoped.
create or replace function public.shared_cocktail_tags(p_token text)
returns table (
  cocktail_id uuid,
  tag_id uuid,
  tag_name text,
  tag_type text
)
language sql
stable
security definer
set search_path = public
as $$
  select ct.cocktail_id, t.id, t.name, t.type
  from public.cocktail_tags ct
  join public.tags t on t.id = ct.tag_id
  join public.cocktails c on c.id = ct.cocktail_id
  where c.owner_id = public.shared_owner_id(p_token)
    and c.status = 'published';
$$;

grant execute on function public.shared_cocktail_tags(text) to anon, authenticated;

-- One cocktail's full detail, scoped to the token's owner. Returns no
-- rows if the cocktail doesn't exist, isn't published, or belongs to a
-- different owner than the token resolves to — the same "not found"
-- shape the signed-in detail page already gives for someone else's
-- cocktail id, so a guessed/foreign id can't be probed via this route.
create or replace function public.shared_cocktail(p_token text, p_cocktail_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  instructions text,
  garnish text,
  glassware text,
  source text,
  favorite boolean,
  photo_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.description, c.instructions, c.garnish,
         c.glassware, c.source, c.favorite, c.photo_url
  from public.cocktails c
  where c.id = p_cocktail_id
    and c.owner_id = public.shared_owner_id(p_token)
    and c.status = 'published';
$$;

grant execute on function public.shared_cocktail(text, uuid) to anon, authenticated;

create or replace function public.shared_cocktail_ingredients(p_token text, p_cocktail_id uuid)
returns table (
  id uuid,
  display_name text,
  amount numeric,
  unit text,
  qualifier text,
  note text,
  "position" integer
)
language sql
stable
security definer
set search_path = public
as $$
  select ri.id, ri.display_name, ri.amount, ri.unit, ri.qualifier, ri.note, ri.position
  from public.recipe_ingredients ri
  join public.cocktails c on c.id = ri.cocktail_id
  where ri.cocktail_id = p_cocktail_id
    and c.owner_id = public.shared_owner_id(p_token)
    and c.status = 'published'
  order by ri.position;
$$;

grant execute on function public.shared_cocktail_ingredients(text, uuid) to anon, authenticated;
