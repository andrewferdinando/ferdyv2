# Category (Framework Item) Wizard — Scheduling Semantics

> **Updated:** 2026-02-09 — Added note about edit-mode accordion layout.

## Source
- UI: `src/components/wizards/FrameworkItemWizard.tsx`.
- Schedule rule upsert: single row per subcategory via unique index `schedule_rules_brand_subcategory_unique` on `(brand_id, subcategory_id)` where `subcategory_id` is not null.

## Create vs Edit mode

- **Create mode**: Uses a 4-step wizard (Type → Details → Schedule → Images). Schedule is Step 3.
- **Edit mode**: Uses an accordion layout with expandable sections (Details, Schedule, Images). The Schedule section contains the same fields but is not gated behind previous steps. The section title shows as "Event dates" for event-type categories.

## Schedule fields (both modes)
- Frequency selector covers weekly, monthly, and specific.
- For `frequency = 'specific'`:
  - Single-date: captures `start_date`, `end_date` (same day), `times_of_day`/`time_of_day`; `days_before` offsets generate posts before the date.
  - Date range (end_date ≠ start_date): shows "Days During" input; saves both `days_before` (before start_date) and `days_during` (offsets from start_date during the range).
- In create mode, the wizard blocks progression unless required specific data is present and satisfies `schedule_rules_specific_chk`.
- In edit mode, validation runs on Save and auto-expands the Schedule section on error.
- Saves schedule_rules with upsert to avoid duplicates and keeps `is_active = true`.

## Media section (Step 4 / Images accordion)
- Asset metadata and URLs load instantly from `useAssets` — `resolveAssetUrls()` populates public URLs synchronously with zero API calls. Grid thumbnails use Vercel's `/_next/image` optimizer (384px WebP, CDN-cached).
- The wizard passes assets (with URLs already populated) to both the library grid and `SortableAssetGrid`.
- Pagination: library grid shows `MEDIA_PAGE_SIZE` (12) items at a time with a "Load more" button.

## What's out
- No "push to drafts" button in the wizard.
- No copy regenerate control; copy is generated automatically by the draft generator.


