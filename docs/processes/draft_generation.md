# Draft Generation — Single Source of Truth

> **Updated:** 2026-02-27 — Generator now skips categories with `setup_complete=false`. Draft generation triggered on wizard Finish (Step 4), not Step 3.

## What this is
- Draft creation is owned by the generator in `src/lib/server/draftGeneration.ts`.
- Runs automatically via Vercel Cron nightly (hits `/api/drafts/generate-all`).
- Can be triggered manually for testing via `/api/drafts/generate` (single brand) or `/api/drafts/generate-all` (all active brands); both endpoints are cron-secret protected.
- **Triggered by the Category Wizard** when the user clicks "Finish and Generate Drafts" (Step 4) or "Save & generate drafts" (edit mode). NOT triggered during Step 3 save.

## setup_complete guard
- The generator **skips subcategories with `setup_complete = false`**.
- Categories are created with `setup_complete = false` during wizard Step 3 and only set to `true` in Step 4 (`handleFinish()`).
- This prevents premature draft creation for categories still being set up.
- The nightly cron also respects this — incomplete categories are skipped until the user finishes setup.

## Behaviour (current model)
- Rolling 30-day window; recomputed every run (idempotent, no monthly pushes).
- Inputs: `brandId` only (no date overrides or UI "push" buttons).
- Output drafts: `approved = false`, `publish_status = 'draft'`.
- Copy generation is automatic and non-optional; placeholder copy is valid; drafts may have no images.
- No "regenerate copy" flow and no "push to drafts" UI.

## Draft ↔ post_jobs relationship
- **One draft = one scheduled post time** (one `scheduled_for` timestamp).
- **Channels are represented by `post_jobs`, not by `drafts.channel`**.
- For each draft, **one `post_jobs` row is created per channel** from `schedule_rules.channels`.
- `post_jobs.schedule_rule_id` is **always set** (never null) for framework-generated drafts.
- `drafts.channel` is legacy/primary only and should not be relied on for publishing.
- Publishing operates exclusively on `post_jobs`.

## Channel handling
- Channels come from `schedule_rules.channels` (normalized text array).
- **Channel normalization** happens at save time (UI) and during generation:
  - `instagram` → `instagram_feed`
  - `linkedin` → `linkedin_profile`
  - Other channels remain as-is (e.g. `instagram_story`, `facebook`).
- The generator uses normalized channels from `schedule_rules.channels` as the single source of truth.
- Each normalized channel results in exactly one `post_jobs` row.

## Scheduling inputs
- Draft generator consumes targets from `rpc_framework_targets`, which expands `schedule_rules` (daily/weekly/monthly/specific) into future timestamps.
- For frequency = `specific`, the `schedule_rules_specific_chk` constraint requires at least one valid mechanism (start_date + times_of_day/time_of_day, or days_before/days_during).
- `rpc_framework_targets` uses a unified time source: `times_of_day` preferred, `time_of_day` fallback.
- For each target, the generator explicitly fetches the active schedule rule using `brand_id + subcategory_id + is_active = true`.
- Channels are read from the resolved `schedule_rule.channels` array.

## Known legacy behaviour
- Some older drafts may only have `instagram_feed` post_jobs, even if the schedule rule specifies multiple channels.
- This occurred when:
  - Channel normalization was not applied at save time.
  - Schedule rule resolution failed silently.
  - Draft generation defaulted to a single channel.
- A backfill process exists to create missing `post_jobs` for legacy drafts.
- Current system ensures all channels from `schedule_rules.channels` result in corresponding `post_jobs` rows.

## Testing outcomes from last cycle
- Test 1: pass (standard).
- Test 2: pass (specific schedule UI + constraint satisfied).
- Test 3: pass (targets generated → drafts created).


