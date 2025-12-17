# Draft Generation — Single Source of Truth

## What this is
- Draft creation is owned by the generator in `src/lib/server/draftGeneration.ts`.
- Runs automatically via Vercel Cron nightly (hits `/api/drafts/generate-all`).
- Can be triggered manually for testing via `/api/drafts/generate` (single brand) or `/api/drafts/generate-all` (all active brands); both endpoints are cron-secret protected.

## Behaviour (current model)
- Rolling 30-day window; recomputed every run (idempotent, no monthly pushes).
- Inputs: `brandId` only (no date overrides or UI “push” buttons).
- Output drafts: `approved = false`, `publish_status = 'draft'`.
- Copy generation is automatic and non-optional; placeholder copy is valid; drafts may have no images.
- No “regenerate copy” flow and no “push to drafts” UI.

## Scheduling inputs
- Draft generator consumes targets from `rpc_framework_targets`, which expands `schedule_rules` (daily/weekly/monthly/specific) into future timestamps.
- For frequency = `specific`, the `schedule_rules_specific_chk` constraint requires at least one valid mechanism (start_date + times_of_day/time_of_day, or days_before/days_during).
- `rpc_framework_targets` uses a unified time source: `times_of_day` preferred, `time_of_day` fallback.

## Testing outcomes from last cycle
- Test 1: pass (standard).
- Test 2: pass (specific schedule UI + constraint satisfied).
- Test 3: pass (targets generated → drafts created).


