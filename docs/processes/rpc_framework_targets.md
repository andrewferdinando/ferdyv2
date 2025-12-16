# Framework Generation — `rpc_framework_targets`

## TL;DR (for AI tools)

`rpc_framework_targets(p_brand_id uuid)` is the **single source of truth** for “what posts should exist in the future” for a brand.

- **Input:** `p_brand_id` (brand UUID)
- **Output rows:**  
  - `brand_id uuid`  
  - `schedule_rule_id uuid`  
  - `scheduled_at timestamptz (UTC)`  
  - `subcategory_id uuid`  
  - `frequency text` (copied from the rule)

It:

- Reads active `schedule_rules` for the brand.
- Expands them into **concrete future datetimes** (`scheduled_at`) for:
  - `frequency IN ('daily','weekly','monthly')` → over **current month + next month**.
  - `frequency = 'specific'` (events) → using `start_date`, `end_date`, `days_before`, `days_during`.
- Respects rule-level timezone if set, otherwise brand timezone, otherwise UTC.
- Returns **only future times** (`scheduled_at > now()`).

These "framework targets" are then consumed by:

- **Draft generator** (`generateDraftsForBrand`) — to create `drafts` + `post_jobs` on a rolling 30-day window.
- Copy generation — to determine event vs evergreen behaviour.
- Future helpers like `rpc_next_framework_window` — to know which windows have coverage.

---

## 1. Function signature & return columns

```sql
CREATE OR REPLACE FUNCTION public.rpc_framework_targets(p_brand_id uuid)
RETURNS TABLE (
  brand_id uuid,
  schedule_rule_id uuid,
  scheduled_at timestamptz,
  subcategory_id uuid,
  frequency text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$ ... $function$;
Each returned row is a framework target:

brand_id — the brand the target belongs to.

schedule_rule_id — the schedule_rules.id that generated this target.

scheduled_at — the UTC datetime when a post should be scheduled.

subcategory_id — the category (subcategory) that will own the draft.

frequency — a copy of the rule’s frequency value (daily, weekly, monthly, or specific).

These rows are ephemeral; they are not stored, just computed on demand.

2. Timezone handling
At the top, the function looks up the brand’s timezone:

sql
Copy code
SELECT timezone INTO v_brand_timezone
FROM brands
WHERE id = p_brand_id;

IF v_brand_timezone IS NULL THEN
  v_brand_timezone := 'UTC';
END IF;
For each rule, it derives an effective timezone:

sql
Copy code
v_effective_timezone := COALESCE(v_rule.timezone, v_brand_timezone);
When building a scheduled_at:

It constructs a local timestamp from date + time_of_day in the effective timezone.

Converts that to UTC for storage/return:

sql
Copy code
v_scheduled_time := (
  (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
  AT TIME ZONE v_effective_timezone
) AT TIME ZONE 'UTC';
So:

All scheduled_at values are UTC.

The original intended local time is respected via the rule’s timezone or brand’s timezone.

3. Coverage window: how far ahead it looks
The function uses:

sql
Copy code
v_months_to_generate int := 2;
And loops over v_month_offset in 0..1:

0 → current month

1 → next month

For each rule with frequency IN ('daily','weekly','monthly'), it:

Starts at the first day of the month.

Ends at the last day of the month.

Generates targets for all valid dates in those two months.

It then filters each generated timestamp to future-only:

sql
Copy code
IF v_scheduled_time > v_current_time THEN
  RETURN QUERY SELECT ...;
END IF;
So:

You always get framework targets from “now” until the end of next month.

Past times (even earlier this month) are filtered out.

For frequency = 'specific' (event rules), it uses the event dates rather than looping month by month (see section 5).

4. Expansion for daily, weekly, monthly
The function first loops over non-event rules:

sql
Copy code
FOR v_rule IN
  SELECT * FROM schedule_rules sr
  WHERE sr.brand_id = p_brand_id
    AND sr.is_active = true
    AND sr.frequency IN ('daily', 'weekly', 'monthly')
    AND sr.subcategory_id IS NOT NULL
LOOP
  ...
END LOOP;
4.1 daily frequency
Logic:

For each of current month and next month:

For every day of the month:

For each time in v_rule.time_of_day (treated as time[]):

Build a timestamp in v_effective_timezone.

Convert to UTC.

If in the future, return a target.

Key snippets:

sql
Copy code
IF v_rule_frequency = 'daily' THEN
  -- Normalize time_of_day into time[]
  ...
  v_target_date := v_month_start;
  WHILE v_target_date <= v_month_end LOOP
    FOREACH v_time_of_day IN ARRAY v_time_array LOOP
      v_scheduled_time := (... v_target_date + v_time_of_day ...) AT TIME ZONE v_effective_timezone AT TIME ZONE 'UTC';
      IF v_scheduled_time > v_current_time THEN
        RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
      END IF;
    END LOOP;
    v_target_date := v_target_date + INTERVAL '1 day';
  END LOOP;
END IF;
So a daily rule will generate every day at each listed time for current + next month.

4.2 weekly frequency
Conditions:

v_rule.days_of_week is not null/empty.

v_rule.time_of_day is set.

Logic:

For each date in the month:

Compute EXTRACT(dow FROM v_target_date) (Postgres dow: 0–6, Sunday=0).

If it matches any value in days_of_week, then:

For each time_of_day, build local time → convert to UTC.

If future, return.

Snippet:

sql
Copy code
IF v_rule_frequency = 'weekly' THEN
  IF v_rule.days_of_week IS NOT NULL 
     AND array_length(v_rule.days_of_week, 1) > 0 
     AND v_rule.time_of_day IS NOT NULL THEN

    v_target_date := v_month_start;
    WHILE v_target_date <= v_month_end LOOP
      v_day_of_week := EXTRACT(dow FROM v_target_date)::int;
      IF v_day_of_week = ANY(v_rule.days_of_week) THEN
        FOREACH v_time_of_day IN ARRAY v_time_array LOOP
          v_scheduled_time := (... v_target_date + v_time_of_day ...) AT TIME ZONE v_effective_timezone AT TIME ZONE 'UTC';
          IF v_scheduled_time > v_current_time THEN
            RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
          END IF;
        END LOOP;
      END IF;
      v_target_date := v_target_date + INTERVAL '1 day';
    END LOOP;
  END IF;
END IF;
Effect:

If a rule says “Mon, Wed, Fri at 10:00”, the function will generate all M/W/F dates in current + next month at 10:00 (local), filtered to future-only.

4.3 monthly frequency (date-of-month)
Here it only handles the date-of-month style pattern (the nth_week/weekday pattern is not implemented in this function).

Conditions:

v_rule.day_of_month is not null.

Logic:

Normalize day_of_month into an int[].

Normalize time_of_day into time[].

For each day_of_month:

If that day exists in the current month (e.g. ignore Feb 30):

Build v_target_date = that day.

For each time_of_day, build local timestamp → UTC.

If future, return.

Snippet:

sql
Copy code
IF v_rule_frequency = 'monthly' THEN
  IF v_rule.day_of_month IS NOT NULL THEN
    -- convert day_of_month to array
    ...
    -- normalize time_of_day to time[]
    ...
    FOREACH v_day_of_month IN ARRAY v_day_array LOOP
      IF v_day_of_month <= EXTRACT(day FROM (v_month_end))::int THEN
        v_target_date := (v_month_start + (v_day_of_month - 1 || ' days')::interval)::date;
      ELSE
        CONTINUE;
      END IF;

      FOREACH v_time_of_day IN ARRAY v_time_array LOOP
        v_scheduled_time := (... v_target_date + v_time_of_day ...) AT TIME ZONE v_effective_timezone AT TIME ZONE 'UTC';
        IF v_scheduled_time > v_current_time THEN
          RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
        END IF;
      END LOOP;
    END LOOP;
  END IF;
END IF;
Effect:

A monthly rule with day_of_month = [1, 15] and time_of_day = 10:00 will generate targets on the 1st and 15th of current + next month, at 10:00 local, if those times are in the future.

Note: nth_week + weekday is not yet used in this function — if you rely on “First Monday” patterns, they are not currently expanded here.

5. Expansion for frequency = 'specific' (events)
After handling daily/weekly/monthly, the function runs a second loop for event-style rules:

sql
Copy code
FOR v_rule IN
  SELECT * FROM schedule_rules sr
  WHERE sr.brand_id = p_brand_id
    AND sr.is_active = true
    AND sr.frequency = 'specific'
    AND sr.subcategory_id IS NOT NULL
LOOP
  v_rule_frequency := 'specific';
  v_effective_timezone := COALESCE(v_rule.timezone, v_brand_timezone);
  ...
END LOOP;
Two major cases:

5.1 Date range events (start_date != end_date)
When both start_date and end_date are set and different:

It treats this as an event range.

It uses days_during to decide which days in the event range should have posts.

For each day in [start_date, end_date]:

If the calendar day number matches any value in days_during:

For each time_of_day, build local timestamp → UTC.

If future, return.

Snippet:

sql
Copy code
IF v_rule.end_date IS NOT NULL AND v_rule.end_date::date != v_rule.start_date::date THEN
  -- Range
  v_start_date := v_rule.start_date;
  v_end_date := v_rule.end_date;

  v_start_date_only := v_start_date::date;
  v_end_date_only := v_end_date::date;

  IF v_rule.days_during IS NOT NULL AND array_length(v_rule.days_during, 1) > 0 THEN
    v_current_date := v_start_date_only;
    WHILE v_current_date <= v_end_date_only LOOP
      IF EXTRACT(day FROM v_current_date)::int = ANY(v_rule.days_during) THEN
        -- for each time_of_day, generate v_scheduled_time ...
      END IF;
      v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
  END IF;
END IF;
Interpretation:

days_during is used here as a day-of-month filter within the range, not as offsets.

If you want “post every day during the event”, days_during would need to cover all day numbers that appear in the range.

5.2 Single-date events (start_date only)
If start_date is set and either end_date is null or equal to start_date:

It treats this as a single event date.

Uses days_before to schedule posts on days before the event, at the specified time_of_day.

Snippet:

sql
Copy code
ELSE
  -- Single date: generate targets for days_before and the date itself
  v_target_date := v_start_date::date;

  -- Handle days_before array
  IF v_rule.days_before IS NOT NULL AND array_length(v_rule.days_before, 1) > 0 THEN
    FOREACH v_days_before IN ARRAY v_rule.days_before LOOP
      v_current_date := v_target_date - (v_days_before || ' days')::interval;

      -- for each time_of_day, build v_scheduled_time
      ...
    END LOOP;
  END IF;
END IF;
Note:

As written, it only uses days_before — not the event date itself, unless days_before includes 0.
(If you want “post on the event date”, you’d include 0 in days_before.)

6. Important behaviours & constraints
Only future times:
Every generated v_scheduled_time must satisfy v_scheduled_time > now() to be returned.

Brand & rule filtering:
Only rules where:

brand_id = p_brand_id

is_active = true

subcategory_id IS NOT NULL

No duplication checks against drafts:
This function does not check existing drafts.
Deduplication against existing framework drafts is handled in the draft generator (`generateDraftsForBrand`), which skips targets already used to create drafts.

Time fields used:
It uses time_of_day, not times_of_day.
The code normalises time_of_day to behave as time[].
(If you migrate fully to times_of_day, this function should be updated.)

Monthly “Nth weekday” rules not implemented:
It currently uses day_of_month only, ignoring nth_week / weekday pattern.

7. Relationship to other processes
7.1 Schedule Rules
schedule_rules define the patterns.

rpc_framework_targets turns those patterns into actual timestamps.

Docs: see schedule-rules.md.

7.2 Draft Generation — generateDraftsForBrand
In the draft generator:

The generator calls rpc_framework_targets(p_brand_id) to get future targets within a 30-day window.

It then:

For each target:

Checks if a draft already exists (deduplication).

Joins with schedule_rules to get channels.

Calls rpc_pick_asset_for_rule(schedule_rule_id) to select assets.

Inserts drafts + post_jobs.

Skips any target that already has a draft for that brand_id + scheduled_for + schedule_source='framework'.

Automatically triggers copy generation for all drafts needing copy.

Docs: see draft_lifecycle.md.

7.3 Copy Generation
The draft generator calls rpc_framework_targets to:

Align drafts’ scheduled_for with the corresponding framework targets.

Infer frequency type and determine if it’s an event (specific → date/date_range).

Build an AI payload including:

frequency_type (daily/weekly/monthly/date/date_range)

Event dates (event_date, start_date, end_date)

Schedule metadata used to shape urgency and angle.

8. History / notes
2025-12-05 — rpc_framework_targets documented in detail from the function source, schedule_rules schema, and draft generator integration.

Potential future changes:

Support for nth_week / weekday monthly patterns.

Alignment with times_of_day rather than time_of_day.

More flexible days_during semantics (“every day in range” vs day-of-month filter).

Configurable number of months to generate (v_months_to_generate).

Mermaid:
flowchart TD
    SR[(schedule_rules)] --> RFT[rpc_framework_targets(p_brand_id)]
    BR[(brands.timezone)] --> RFT

    subgraph Rules
        SRD[frequency = daily]
        SRW[frequency = weekly]
        SRM[frequency = monthly]
        SRS[frequency = specific\n(date or date_range)]
    end

    SR --> SRD
    SR --> SRW
    SR --> SRM
    SR --> SRS

    RFT --> TGT[(Framework Targets\nbrand_id, schedule_rule_id,\nsubcategory_id, scheduled_at, frequency)]

    TGT --> GEN[Draft Generator\n(generateDraftsForBrand)]
    TGT --> DEBUG[Debugging / Admin views\n(when needed)]
