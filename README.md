# Pourhouse

A personal, web-based cocktail library — search by name or ingredients on
hand, discover adjacent drinks, and grow a well-organized collection. See
[`bartending-app-prd.md`](bartending-app-prd.md) for the full product spec.

**Stack:** Next.js (App Router, TypeScript) · Tailwind CSS · Supabase
(Postgres, Auth, Storage) — per PRD §10.

## Status

Phase 1 scaffold: project structure, route shell for every area in the
information architecture (PRD §7), Supabase client wiring, and the initial
database schema. Pages are structural placeholders — no auth flow, library
UI, or import pipeline yet.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then copy
`.env.example` to `.env.local` and fill in the values from
**Project Settings → API**:

```bash
cp .env.example .env.local
```

### 3. Apply the database schema

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

This runs the migrations in [`supabase/migrations/`](supabase/migrations/) —
see [`supabase/SCHEMA.md`](supabase/SCHEMA.md) for what they set up
(tables, indexes, Row-Level Security policies, and the starter
primary-ingredient/style taxonomy).

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
  app/
    (auth)/          Sign in, sign up, onboarding — unauthenticated routes
    (app)/            Home, library, cocktail detail, add/edit, imports, settings
  lib/supabase/       Browser, server, and proxy (request-middleware) Supabase clients
  types/database.ts   Hand-written types mirroring the schema (regenerate
                       with `supabase gen types typescript --linked` once
                       the project is linked)
  proxy.ts             Keeps the auth session cookie fresh (PRD §6.1)
supabase/
  migrations/          Schema + seed data, applied in filename order
  SCHEMA.md             Schema documentation and security model
```

## Security notes

- Row-Level Security is enabled on every user-owned table; the app always
  uses the Supabase **anon** key from client code, never the service role
  key (PRD §11).
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.example` is reserved for future
  server-side import processing and admin taxonomy management — it must
  never ship to the browser.
