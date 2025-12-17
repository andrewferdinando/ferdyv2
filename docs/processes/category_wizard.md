# Category (Framework Item) Wizard — Scheduling Semantics

## Source
- UI: `src/components/wizards/FrameworkItemWizard.tsx`.
- Schedule rule upsert: single row per subcategory via unique index `schedule_rules_brand_subcategory_unique` on `(brand_id, subcategory_id)` where `subcategory_id` is not null.

## Step 3: Schedule (current behaviour)
- Frequency selector covers weekly, monthly, and specific.
- For `frequency = 'specific'`:
  - Single-date: captures `start_date`, `end_date` (same day), `times_of_day`/`time_of_day`; `days_before` offsets generate posts before the date.
  - Date range (end_date ≠ start_date): shows “Days During” input; saves both `days_before` (before start_date) and `days_during` (offsets from start_date during the range).
- The wizard blocks progression unless required specific data is present and satisfies `schedule_rules_specific_chk`.
- Saves schedule_rules with upsert to avoid duplicates and keeps `is_active = true`.

## What’s out
- No “push to drafts” button in the wizard.
- No copy regenerate control; copy is generated automatically by the draft generator.


