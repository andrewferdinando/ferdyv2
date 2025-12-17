# Scheduling — schedule_rules and rpc_framework_targets

## Core tables & functions
- Table: `schedule_rules` (one active rule per subcategory via unique index `schedule_rules_brand_subcategory_unique` on `(brand_id, subcategory_id)` where `subcategory_id` not null).
- Expander: `public.rpc_framework_targets(p_brand_id uuid)` — returns future targets for `daily`, `weekly`, `monthly`, and `specific`.
- Generator: `src/lib/server/draftGeneration.ts` consumes targets to create drafts.

## Semantics (freq = specific)
- Constraint: `schedule_rules_specific_chk` requires at least one valid mechanism:
  - `start_date` + `times_of_day`/`time_of_day`, **or**
  - `days_before` has values, **or**
  - `days_during` has values.
- Single date: `start_date = end_date`; `days_before` offsets post before the event date.
- Date range (`end_date` ≠ `start_date`): `days_during` offsets from `start_date` during the range; `days_before` still applies (before `start_date`).
- Time source: `rpc_framework_targets` uses `COALESCE(times_of_day, time_of_day)` so legacy and new rows both work.

### Offsets (Semantics)
- `days_before`: integers before `start_date` (e.g., `1` = one day before).
- `days_during`: integers from `start_date` (`0` = start day, `1` = next day, etc.).

## Wizard behaviour (UI link)
- `FrameworkItemWizard.tsx` shows event-style scheduling when `frequency = 'specific'`.
- Date range shows “Days During”; single date hides it.
- Saves `days_before` and `days_during` into `schedule_rules` and upserts to avoid duplicates.

## Targets and drafts
- `rpc_framework_targets` returns only future `scheduled_at` values.
- Draft generator runs on a rolling 30-day window (nightly cron) and can be triggered manually via `/api/drafts/generate` (single brand) or `/api/drafts/generate-all` (all active brands), both cron-secret protected.
- Drafts are created with `approved = false`, `publish_status = 'draft'`; copy may be placeholder; images are optional.


