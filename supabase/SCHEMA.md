# Pourhouse database schema — Phase 1

Migrations live in [`migrations/`](migrations/) and apply in filename order via the
Supabase CLI (`supabase db push` / `supabase migration up`). Written against
PostgreSQL as provisioned by Supabase.

| File | Purpose |
|---|---|
| `0001_init.sql` | Tables, indexes, triggers, and Row-Level Security policies |
| `0002_seed_taxonomy.sql` | Starter canonical primary-ingredient tags, style tags, and ingredients |

## Tables

| Table | Maps to PRD §9 | Notes |
|---|---|---|
| `profiles` | User | 1:1 with `auth.users`, populated by a trigger on signup |
| `cocktails` | Cocktail | `owner_id`-scoped; `status` is `draft` / `published` / `archived` |
| `recipe_ingredients` | RecipeIngredient | Kept separate from `cocktails` for fast ingredient-based filtering |
| `ingredients` | Ingredient | Global canonical list; read-only to users, seeded/managed centrally |
| `tags` | Tag | `primary` and `style` are global (`owner_id null`); `custom` is per-user |
| `cocktail_tags` | CocktailTag | Join table |
| `import_batches` | ImportBatch | One row per Apple Notes upload |
| `import_items` | ImportItem | One row per parsed note; retains `raw_source` for traceability |

## Security model (PRD §11)

- Every user-owned table has RLS **enabled**, with `owner_id = auth.uid()` (or a join
  back to a table that has `owner_id`) required for `select`/`insert`/`update`/`delete`.
- `ingredients`, and `primary`/`style` rows in `tags`, are readable by any authenticated
  user but not writable from the client — they're a managed taxonomy, seeded via
  migration and (later) an admin-only edge function.
- `custom` tags are owned by the creating user and follow the same `owner_id` pattern.
- The app must always use the Supabase **anon** key from the browser so RLS applies;
  `SUPABASE_SERVICE_ROLE_KEY` is server-only (import processing, admin taxonomy edits)
  and must never reach client code.

## Naming / search conventions

- `normalized_name` columns are maintained by a `BEFORE INSERT OR UPDATE` trigger
  (`public.normalize_text`: lowercased, trimmed, whitespace-collapsed) — the app does
  not need to compute or send it.
- `pg_trgm` + GIN indexes on `normalized_name` back case-insensitive, partial-match
  name search (PRD §6.3). Add full-text search only once substring matching proves
  insufficient, per the PRD's implementation notes.
- Duplicate-cocktail detection (PRD §6.2) queries `cocktails (owner_id, normalized_name)`
  plus a comparison of each candidate's `recipe_ingredients`.

## Applying migrations

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or, for local development against the Supabase CLI's local Postgres:

```bash
supabase start
supabase db reset
```
