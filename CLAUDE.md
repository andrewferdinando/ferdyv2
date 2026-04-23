# Ferdy — AI Context

Ferdy is a social media automation platform for small businesses and agencies. It auto-generates and publishes posts to Facebook, Instagram, and LinkedIn. This file is the always-on context for any AI assistant (Claude Code, Chat, Cowork) working in this repo.

---

## Tech Stack

- **Frontend/API**: Next.js 15 (App Router), React 19, TypeScript
- **Hosting**: Vercel (Node runtime)
- **DB/Auth/Storage**: Supabase (Postgres, RLS, Auth, Storage)
- **AI copy**: OpenAI
- **Payments**: Stripe (per-brand monthly billing, NZD)
- **Email**: Resend (from `support@ferdy.io`)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Fonts**: Plus Jakarta Sans (marketing), Inter (app)
- **Testing**: Playwright

## Commands

- `pnpm dev` — local dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm exec tsc --noEmit` — type-check only (no build script defined)
- `pnpm exec playwright test` — e2e tests

No test/typecheck npm script is defined; invoke the binaries directly.

---

## Repo Layout

```
src/
  app/            Next.js App Router (pages + /api routes)
  components/     React components (wizards, forms, UI)
  contexts/       React contexts
  emails/         React Email templates
  hooks/          React hooks
  lib/            Shared client+server utilities
  server/         Server-only code (publishing, social, supabase admin)
  styles/         Global CSS
  types/          Shared TypeScript types
docs/processes/   Source-of-truth process docs — READ BEFORE CHANGING BEHAVIOUR
supabase/         Migrations and SQL
scripts/          One-off scripts (tsx)
```

---

## Source of Truth: `docs/processes/`

Before modifying any non-trivial feature, read the matching process doc. Update it when behaviour changes. Start from [docs/processes/README.md](docs/processes/README.md). Key docs:

- [architecture.md](docs/processes/architecture.md) — system overview
- [onboarding.md](docs/processes/onboarding.md), [sign-in.md](docs/processes/sign-in.md), [password-reset.md](docs/processes/password-reset.md)
- [add-team-member.md](docs/processes/add-team-member.md), [brand-management.md](docs/processes/brand-management.md)
- [category_creation_flow.md](docs/processes/category_creation_flow.md), [schedule_rules.md](docs/processes/schedule_rules.md)
- [rpc_framework_targets.md](docs/processes/rpc_framework_targets.md), [draft_lifecycle.md](docs/processes/draft_lifecycle.md)
- [post_jobs_and_publishing_engine.md](docs/processes/post_jobs_and_publishing_engine.md)
- [groups-and-billing.md](docs/processes/groups-and-billing.md), [roles-and-permissions.md](docs/processes/roles-and-permissions.md)
- [email-notifications.md](docs/processes/email-notifications.md), [newsletter-contacts.md](docs/processes/newsletter-contacts.md)
- [social_api_connections.md](docs/processes/social_api_connections.md), [image_processing.md](docs/processes/image_processing.md)

---

## Core Automation Pipeline

```
schedule_rules
  → rpc_framework_targets()  (SQL, generates future slots)
  → generateDraftsForBrand()  (src/lib/server/draftGeneration.ts)
  → drafts + post_jobs  (one post_job per channel)
  → publishing engine  (src/server/publishing/publishJob.ts)
  → FB / IG / LinkedIn
```

Cascade warning: changes to `schedule_rules` affect `rpc_framework_targets` → draft generator → publishing. Trace the chain before editing.

## Cron Jobs

- **Vercel Cron** (`vercel.json`): draft generation nightly, weekly approval summary, token-expiry checks, webinar reminders, etc.
- **3rd-party cron** (cron-job.org): hits `/api/publishing/run` every 3 min to publish due `post_jobs`.

---

## Key Conventions

- "Categories" in UI = `subcategories` table in DB.
- **UI terminology: "Group", never "Account"** — customer-facing copy only.
- One draft = one scheduled time. Channels live on `post_jobs` (one per channel). `drafts.channel` is legacy — do not use.
- `post_jobs.schedule_rule_id` is always set for framework drafts.
- Channel normalization: `instagram` → `instagram_feed`, `linkedin` → `linkedin_profile`.
- Brand timezone is **immutable** after creation.
- Copy generation is automatic and non-optional; there is no "regenerate" concept.
- Draft generation = rolling 30-day window. Nightly Vercel Cron + on-demand after category creation.
- Assets: `ferdy-assets` bucket is public. `resolveAssetUrls()` runs synchronously in `useAssets` — no per-render API calls.

## Roles

- **Group-level** (on `profiles`): `super_admin`, `admin`, `member`
- **Brand-level** (on `brand_memberships`): `admin`, `editor`

## DB Constraints to Respect

- `schedule_rules_brand_subcategory_unique` — one active rule per subcategory.
- `schedule_rules_specific_chk` — enforces valid specific-frequency combos.
- `drafts_unique_framework` — does **not** filter on status; published/deleted drafts still block recreation at the same slot.
- `post_jobs.status` values: `pending`, `ready`, `generated`, `publishing`, `success`, `failed`, `canceled` — not `scheduled`.
- Supabase join ambiguity: `drafts ↔ post_jobs` joins must specify the FK name.
- `schedule_rules` has both `time_of_day` (time[]) and `times_of_day` (time[]); RPC uses `time_of_day`.
- Sunday dow: wizard stores ISO (1=Mon, 7=Sun), RPC must use `EXTRACT(isodow)` not `EXTRACT(dow)`.

## Publishing Retry System

- `post_jobs.attempt_count` caps at `MAX_PUBLISH_ATTEMPTS` (3).
- In-call retry: failed jobs get one 30 s-delayed retry within the same run.
- Cron retry: next run picks up `attempt_count < 3` (60 s min between attempts).
- Email notifications are **deferred** until every job on the draft reaches a terminal state — one consolidated `PostPublished` or `PublishingFailed` per draft.
- Manual retry (`/api/publishing/retry`) and Publish Now reset `attempt_count` to 0.
- IG Feed image polling: 40×1.5 s = 60 s. IG Story image polling: 40×2 s = 80 s.

## Facebook / Meta OAuth

- App uses **Facebook Login for Business** (FLIB), not classic Facebook Login.
- Graph API: **v21.0**.
- `me/accounts` can return empty for non-tester users even with all permissions approved (known FLIB behaviour). Workaround: call `debug_token`, extract page IDs from `granular_scopes`, fetch each page via `/{page-id}?fields=...`.
- OAuth URL uses `auth_type=reauthenticate` to force a fresh login.

---

## Hard Rules

1. **Deployment target**: only push to the `ferdyv2` repo. Never push to `ferdy-app`.
2. **Supabase queries**: always use the Supabase MCP for SQL. Never ask the user to run queries manually.
3. **No "contact support" UX**: every error path must offer a self-service recovery. If you can't build one, flag it.
4. **Keep terminology consistent**: "Group" (not "Account"), "Category" (not "Subcategory") in user-facing strings.
5. **Don't use `drafts.channel`** — it's legacy. Publishing is driven by `post_jobs`.
6. **Update docs with behaviour changes** — the process doc in `docs/processes/` is canonical.
7. **No backwards-compat shims for unreleased features** — this is a pre-scale product; change the code cleanly.

---

## Key File Locations

- Draft generation: [src/lib/server/draftGeneration.ts](src/lib/server/draftGeneration.ts)
- Copy generation: [src/lib/generateCopyBatch.ts](src/lib/generateCopyBatch.ts)
- Publishing: [src/server/publishing/publishJob.ts](src/server/publishing/publishJob.ts)
- Image processing: [src/lib/image-processing/processImage.ts](src/lib/image-processing/processImage.ts)
- Token refresh: [src/server/social/tokenRefresh.ts](src/server/social/tokenRefresh.ts)
- Facebook OAuth: [src/lib/integrations/facebook.ts](src/lib/integrations/facebook.ts)
- Category wizard: [src/components/wizards/FrameworkItemWizard.tsx](src/components/wizards/FrameworkItemWizard.tsx)
- Email send: [src/lib/emails/send.ts](src/lib/emails/send.ts); templates in [src/emails/](src/emails/)
- Cron config: [vercel.json](vercel.json)
