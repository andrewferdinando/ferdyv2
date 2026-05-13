# Database Migrations — Conventions & Checklist

This doc covers conventions for writing SQL migrations against the Supabase Postgres in `supabase/`. The most important rule below is the **Data API grants** section — without it, new tables you create after **Oct 30, 2026** will be invisible to `supabase-js` and the PostgREST/GraphQL endpoints.

---

## Why grants matter (Supabase Data API policy change)

Supabase announced (May 2026) that the `public` schema will no longer be auto-exposed to the Data API for new tables. Rollout:

- **May 30, 2026** — default for all *new* Supabase projects.
- **Oct 30, 2026** — enforced on *all existing projects*, including Ferdy.

After that date, any `CREATE TABLE public.foo` without explicit `GRANT` statements will produce a PostgREST `42501` error when `supabase-js` (or anything hitting `/rest/v1/` or `/graphql/v1/`) tries to read it.

This change does **not** affect:

- Direct Postgres connections (psql, ORMs, server-side workers using the connection string).
- Existing tables — their current grants are preserved.

In Ferdy we use `supabase-js` extensively from the Next.js app, plus RPCs via PostgREST (`rpc_framework_targets`, `rpc_pick_asset_for_rule`, etc.), so the Data API path is load-bearing.

---

## New-table checklist

Every migration that creates a table in `public` must include all five sections below. Skipping the grants will silently work in dev (RLS off, service role bypasses) but fail in the app after Oct 30.

```sql
-- 1. Create the table
create table public.your_table (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- ... columns ...
);

-- 2. Grants — required for Data API access
-- Ferdy convention:
--   * authenticated  = signed-in users (the app)
--   * service_role   = server-side admin client (cron, webhooks, RPCs)
--   * anon           = only grant if a public/unauthenticated endpoint reads it
grant select, insert, update, delete
  on public.your_table
  to authenticated;

grant select, insert, update, delete
  on public.your_table
  to service_role;

-- Only add this line if anon readers actually need access:
-- grant select on public.your_table to anon;

-- 3. Enable RLS (always, even for service-role-only tables)
alter table public.your_table enable row level security;

-- 4. RLS policies — restrict by brand/group/user as appropriate
create policy "members can read rows for their brand"
  on public.your_table
  for select to authenticated
  using (
    brand_id in (
      select brand_id from public.brand_memberships
      where user_id = auth.uid()
    )
  );

-- 5. Indexes for FK columns and common query paths
create index your_table_brand_id_idx on public.your_table (brand_id);
```

### Sequences

If the table uses a `bigserial` / `serial` column, also grant on the underlying sequence:

```sql
grant usage, select on sequence public.your_table_id_seq to authenticated, service_role;
```

### RPC functions

Functions exposed via `supabase.rpc(...)` need execute grants:

```sql
grant execute on function public.your_rpc(arg1 text) to authenticated, service_role;
```

If a function is only ever called by the server (admin client / cron), grant to `service_role` only.

---

## Quick "am I exposing this safely?" decision tree

1. **Who reads/writes this table?**
   - Only server-side workers/cron → grant to `service_role` only.
   - Signed-in users via the app → grant to `authenticated` + `service_role`.
   - Public/unauthenticated readers (marketing pages, public profiles) → also `grant select to anon`.

2. **Does it contain per-user/per-brand data?**
   - Yes → enable RLS and add policies scoped to `auth.uid()` / `brand_memberships`.
   - No (e.g., a global lookup table) → still enable RLS; add a "read for everyone" policy if needed.

3. **Is there a sequence or RPC tied to the table?**
   - Yes → grant on those too (see above).

---

## Verifying after a migration

After applying a migration that creates tables:

1. **Run the Security Advisor** in the Supabase dashboard — it flags tables missing RLS or with overly permissive policies.
2. **Smoke-test from the app** — hit a route that queries the new table while signed in. A `42501` error in the network panel means a missing grant; PostgREST returns the exact `GRANT` statement to fix it.
3. **Check the migration locally first** — `pnpm supabase db reset` (or whatever the local-dev command is) rebuilds the schema and surfaces grant issues before you push.

---

## Existing tables

You generally don't need to touch existing tables — their grants are preserved through Oct 30 and beyond. If the Security Advisor flags one, fix it with a targeted migration; don't blanket-regrant the schema.

---

## Cross-references

- [architecture.md](architecture.md) — overall data flow
- [roles-and-permissions.md](roles-and-permissions.md) — how RLS policies map to app-level roles
- [rpc_framework_targets.md](rpc_framework_targets.md) — example of a `SECURITY DEFINER` RPC pattern in Ferdy
