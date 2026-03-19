-- Fix: rpc_framework_targets - two bugs in date-range event handling:
-- 1. days_before was only processed for single-date events, not date ranges
-- 2. days_during used EXTRACT(day) (calendar day-of-month) instead of offset from start_date
--
-- This restructures the specific-frequency section so:
-- - days_before runs for ALL events (single-date and date-range)
-- - days_during treats values as day offsets from start_date (e.g. [1,2] = day 1 and 2 after start)
--
-- Already deployed to production via Supabase MCP on 2026-03-19.

DROP FUNCTION IF EXISTS rpc_framework_targets(uuid) CASCADE;

CREATE FUNCTION rpc_framework_targets(p_brand_id uuid)
RETURNS TABLE (
    brand_id uuid,
    rule_id uuid,
    scheduled_at timestamptz,
    subcategory_id uuid,
    frequency text
) AS $$
DECLARE
    v_rule RECORD;
    v_rule_frequency text;
    v_current_date date;
    v_month_start date;
    v_month_end date;
    v_target_date date;
    v_scheduled_time timestamptz;
    v_time_of_day time;
    v_day_of_week int;
    v_week_count int;
    v_target_weekday int;
    v_days_before int;
    v_days_during int;
    v_start_date timestamptz;
    v_end_date timestamptz;
    v_time_array time[];
    v_current_time timestamptz := now();
    v_months_to_generate int := 2;
    v_month_offset int;
    v_day_of_month int;
    v_day_array int[];
    v_start_date_only date;
    v_end_date_only date;
    v_brand_timezone text;
    v_effective_timezone text;
    v_first_occurrence date;
BEGIN
    SELECT timezone INTO v_brand_timezone
    FROM brands
    WHERE id = p_brand_id;

    IF v_brand_timezone IS NULL THEN
        v_brand_timezone := 'UTC';
    END IF;

    -- Generate targets for daily, weekly, and monthly frequencies
    FOR v_rule IN
        SELECT * FROM schedule_rules sr
        WHERE sr.brand_id = p_brand_id
          AND sr.is_active = true
          AND sr.frequency IN ('daily', 'weekly', 'monthly')
          AND sr.subcategory_id IS NOT NULL
    LOOP
        v_rule_frequency := v_rule.frequency;
        v_effective_timezone := COALESCE(v_rule.timezone, v_brand_timezone);

        FOR v_month_offset IN 0..(v_months_to_generate - 1) LOOP
            v_current_date := date_trunc('month', CURRENT_DATE) + (v_month_offset || ' months')::interval;
            v_month_start := v_current_date;
            v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::date;

            IF v_rule_frequency = 'daily' THEN
                IF v_rule.time_of_day IS NOT NULL THEN
                    IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                        v_time_array := v_rule.time_of_day;
                    ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                        v_time_array := ARRAY[v_rule.time_of_day::time];
                    ELSE
                        v_time_array := ARRAY[]::time[];
                    END IF;

                    v_target_date := v_month_start;
                    WHILE v_target_date <= v_month_end LOOP
                        FOREACH v_time_of_day IN ARRAY v_time_array LOOP
                            v_scheduled_time := ((v_target_date::text || ' ' || v_time_of_day::text)::timestamp AT TIME ZONE v_effective_timezone) AT TIME ZONE 'UTC';
                            IF v_scheduled_time > v_current_time THEN
                                RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                            END IF;
                        END LOOP;
                        v_target_date := v_target_date + INTERVAL '1 day';
                    END LOOP;
                END IF;

            ELSIF v_rule_frequency = 'weekly' THEN
                IF v_rule.days_of_week IS NOT NULL AND array_length(v_rule.days_of_week, 1) > 0 AND v_rule.time_of_day IS NOT NULL THEN
                    IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                        v_time_array := v_rule.time_of_day;
                    ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                        v_time_array := ARRAY[v_rule.time_of_day::time];
                    ELSE
                        v_time_array := ARRAY[]::time[];
                    END IF;

                    v_target_date := v_month_start;
                    WHILE v_target_date <= v_month_end LOOP
                        v_day_of_week := EXTRACT(isodow FROM v_target_date)::int;
                        IF v_day_of_week = ANY(v_rule.days_of_week) THEN
                            FOREACH v_time_of_day IN ARRAY v_time_array LOOP
                                v_scheduled_time := ((v_target_date::text || ' ' || v_time_of_day::text)::timestamp AT TIME ZONE v_effective_timezone) AT TIME ZONE 'UTC';
                                IF v_scheduled_time > v_current_time THEN
                                    RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                                END IF;
                            END LOOP;
                        END IF;
                        v_target_date := v_target_date + INTERVAL '1 day';
                    END LOOP;
                END IF;

            ELSIF v_rule_frequency = 'monthly' THEN
                IF v_rule.day_of_month IS NOT NULL THEN
                    IF pg_typeof(v_rule.day_of_month) = 'integer[]'::regtype THEN
                        v_day_array := v_rule.day_of_month;
                    ELSIF pg_typeof(v_rule.day_of_month) = 'integer'::regtype THEN
                        v_day_array := ARRAY[v_rule.day_of_month::int];
                    ELSE
                        v_day_array := ARRAY[]::int[];
                    END IF;

                    IF v_rule.time_of_day IS NOT NULL THEN
                        IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                            v_time_array := v_rule.time_of_day;
                        ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                            v_time_array := ARRAY[v_rule.time_of_day::time];
                        ELSE
                            v_time_array := ARRAY[]::time[];
                        END IF;

                        FOREACH v_day_of_month IN ARRAY v_day_array LOOP
                            IF v_day_of_month <= EXTRACT(day FROM (v_month_end))::int THEN
                                v_target_date := (v_month_start + (v_day_of_month - 1 || ' days')::interval)::date;
                            ELSE
                                CONTINUE;
                            END IF;
                            FOREACH v_time_of_day IN ARRAY v_time_array LOOP
                                v_scheduled_time := ((v_target_date::text || ' ' || v_time_of_day::text)::timestamp AT TIME ZONE v_effective_timezone) AT TIME ZONE 'UTC';
                                IF v_scheduled_time > v_current_time THEN
                                    RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                                END IF;
                            END LOOP;
                        END LOOP;
                    END IF;

                ELSIF v_rule.nth_week IS NOT NULL AND v_rule.weekday IS NOT NULL THEN
                    IF v_rule.time_of_day IS NOT NULL THEN
                        IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                            v_time_array := v_rule.time_of_day;
                        ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                            v_time_array := ARRAY[v_rule.time_of_day::time];
                        ELSE
                            v_time_array := ARRAY[]::time[];
                        END IF;

                        v_target_weekday := v_rule.weekday;
                        v_day_of_week := EXTRACT(isodow FROM v_month_start)::int;
                        v_first_occurrence := v_month_start + ((v_target_weekday - v_day_of_week + 7) % 7 || ' days')::interval;

                        IF v_rule.nth_week = 5 THEN
                            v_target_date := v_first_occurrence;
                            WHILE (v_target_date + INTERVAL '7 days')::date <= v_month_end LOOP
                                v_target_date := (v_target_date + INTERVAL '7 days')::date;
                            END LOOP;
                        ELSE
                            v_target_date := (v_first_occurrence + ((v_rule.nth_week - 1) * 7 || ' days')::interval)::date;
                        END IF;

                        IF v_target_date <= v_month_end THEN
                            FOREACH v_time_of_day IN ARRAY v_time_array LOOP
                                v_scheduled_time := ((v_target_date::text || ' ' || v_time_of_day::text)::timestamp AT TIME ZONE v_effective_timezone) AT TIME ZONE 'UTC';
                                IF v_scheduled_time > v_current_time THEN
                                    RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                                END IF;
                            END LOOP;
                        END IF;
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    -- Generate targets for frequency='specific' rules
    FOR v_rule IN
        SELECT * FROM schedule_rules sr
        WHERE sr.brand_id = p_brand_id
          AND sr.is_active = true
          AND sr.frequency = 'specific'
          AND sr.subcategory_id IS NOT NULL
    LOOP
        v_rule_frequency := 'specific';
        v_effective_timezone := COALESCE(v_rule.timezone, v_brand_timezone);

        IF v_rule.start_date IS NOT NULL THEN
            v_start_date := v_rule.start_date;

            -- Build time array once for this rule
            IF v_rule.time_of_day IS NOT NULL THEN
                IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                    v_time_array := v_rule.time_of_day;
                ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                    v_time_array := ARRAY[v_rule.time_of_day::time];
                ELSE
                    v_time_array := ARRAY[]::time[];
                END IF;
            ELSE
                CONTINUE;
            END IF;

            v_start_date_only := v_start_date::date;

            -- Process days_before: posts leading up to start_date
            -- Applies to BOTH single-date AND date-range events
            IF v_rule.days_before IS NOT NULL AND array_length(v_rule.days_before, 1) > 0 THEN
                FOREACH v_days_before IN ARRAY v_rule.days_before LOOP
                    IF v_days_before < 0 THEN
                        CONTINUE;
                    END IF;
                    v_target_date := v_start_date_only - (v_days_before || ' days')::interval;
                    FOREACH v_time_of_day IN ARRAY v_time_array LOOP
                        v_scheduled_time := ((v_target_date::text || ' ' || v_time_of_day::text)::timestamp AT TIME ZONE v_effective_timezone) AT TIME ZONE 'UTC';
                        IF v_scheduled_time > v_current_time THEN
                            RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                        END IF;
                    END LOOP;
                END LOOP;
            END IF;

            -- Process days_during: posts during the date range
            IF v_rule.end_date IS NOT NULL AND v_rule.end_date::date != v_rule.start_date::date THEN
                v_end_date := v_rule.end_date;
                v_end_date_only := v_end_date::date;

                -- days_during values are OFFSETS from start_date (e.g. [1,2] = day 1 and day 2 after start)
                IF v_rule.days_during IS NOT NULL AND array_length(v_rule.days_during, 1) > 0 THEN
                    FOREACH v_days_during IN ARRAY v_rule.days_during LOOP
                        IF v_days_during < 0 THEN
                            CONTINUE;
                        END IF;
                        v_target_date := v_start_date_only + (v_days_during || ' days')::interval;
                        IF v_target_date > v_end_date_only THEN
                            CONTINUE;
                        END IF;
                        FOREACH v_time_of_day IN ARRAY v_time_array LOOP
                            v_scheduled_time := ((v_target_date::text || ' ' || v_time_of_day::text)::timestamp AT TIME ZONE v_effective_timezone) AT TIME ZONE 'UTC';
                            IF v_scheduled_time > v_current_time THEN
                                RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                            END IF;
                        END LOOP;
                    END LOOP;
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_framework_targets(uuid) TO authenticated;

COMMENT ON FUNCTION rpc_framework_targets(uuid) IS
    'Generates framework targets for all schedule rules (daily, weekly, monthly, and specific date/range) from current month through next month. Returns brand_id, rule_id, scheduled_at, subcategory_id, and frequency for each target. Only returns future targets (scheduled_at > now()).';
