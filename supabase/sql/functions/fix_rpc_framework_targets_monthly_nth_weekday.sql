-- Fix: Monthly frequency with nth_week + weekday (e.g. "first Friday of every month")
-- was completely ignored by the RPC. The monthly block only handled day_of_month.
-- This adds an ELSIF branch for nth_week/weekday rules.
--
-- nth_week values: 1=First, 2=Second, 3=Third, 4=Fourth, 5=Last
-- weekday values: 1=Monday ... 7=Sunday (ISO convention, matching wizard)

DROP FUNCTION IF EXISTS rpc_framework_targets(uuid) CASCADE;

CREATE FUNCTION rpc_framework_targets(p_brand_id uuid)
RETURNS TABLE (
    brand_id uuid,
    schedule_rule_id uuid,
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
    -- Get brand timezone once for the entire function
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
                        FOREACH v_time_of_day IN ARRAY v_time_array
                        LOOP
                            v_scheduled_time := (
                                (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                                AT TIME ZONE v_effective_timezone
                            ) AT TIME ZONE 'UTC';

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
                        -- FIX: Use isodow (1=Mon..7=Sun) to match the wizard's ISO convention.
                        v_day_of_week := EXTRACT(isodow FROM v_target_date)::int;
                        IF v_day_of_week = ANY(v_rule.days_of_week) THEN
                            FOREACH v_time_of_day IN ARRAY v_time_array
                            LOOP
                                v_scheduled_time := (
                                    (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                                    AT TIME ZONE v_effective_timezone
                                ) AT TIME ZONE 'UTC';

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
                    -- Mode A: Specific day(s) of the month (e.g. 1st, 15th)
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

                        FOREACH v_day_of_month IN ARRAY v_day_array
                        LOOP
                            IF v_day_of_month <= EXTRACT(day FROM (v_month_end))::int THEN
                                v_target_date := (v_month_start + (v_day_of_month - 1 || ' days')::interval)::date;
                            ELSE
                                CONTINUE;
                            END IF;

                            FOREACH v_time_of_day IN ARRAY v_time_array
                            LOOP
                                v_scheduled_time := (
                                    (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                                    AT TIME ZONE v_effective_timezone
                                ) AT TIME ZONE 'UTC';

                                IF v_scheduled_time > v_current_time THEN
                                    RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                                END IF;
                            END LOOP;
                        END LOOP;
                    END IF;

                ELSIF v_rule.nth_week IS NOT NULL AND v_rule.weekday IS NOT NULL THEN
                    -- Mode B: Nth weekday of the month (e.g. "first Friday", "last Monday")
                    -- nth_week: 1=First, 2=Second, 3=Third, 4=Fourth, 5=Last
                    -- weekday: 1=Mon ... 7=Sun (ISO)
                    IF v_rule.time_of_day IS NOT NULL THEN
                        IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                            v_time_array := v_rule.time_of_day;
                        ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                            v_time_array := ARRAY[v_rule.time_of_day::time];
                        ELSE
                            v_time_array := ARRAY[]::time[];
                        END IF;

                        -- Find the first occurrence of the target weekday in the month
                        v_target_weekday := v_rule.weekday;  -- 1-7 ISO
                        v_day_of_week := EXTRACT(isodow FROM v_month_start)::int;
                        v_first_occurrence := v_month_start + ((v_target_weekday - v_day_of_week + 7) % 7 || ' days')::interval;

                        IF v_rule.nth_week = 5 THEN
                            -- "Last" weekday: advance to the last occurrence within the month
                            v_target_date := v_first_occurrence;
                            WHILE (v_target_date + INTERVAL '7 days')::date <= v_month_end LOOP
                                v_target_date := (v_target_date + INTERVAL '7 days')::date;
                            END LOOP;
                        ELSE
                            -- Nth occurrence: first + (n-1) weeks
                            v_target_date := (v_first_occurrence + ((v_rule.nth_week - 1) * 7 || ' days')::interval)::date;
                        END IF;

                        -- Only generate if the date is still within the month
                        IF v_target_date <= v_month_end THEN
                            FOREACH v_time_of_day IN ARRAY v_time_array
                            LOOP
                                v_scheduled_time := (
                                    (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                                    AT TIME ZONE v_effective_timezone
                                ) AT TIME ZONE 'UTC';

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

            IF v_rule.end_date IS NOT NULL AND v_rule.end_date::date != v_rule.start_date::date THEN
                v_end_date := v_rule.end_date;
                v_start_date_only := v_start_date::date;
                v_end_date_only := v_end_date::date;

                IF v_rule.days_during IS NOT NULL AND array_length(v_rule.days_during, 1) > 0 THEN
                    v_current_date := v_start_date_only;
                    WHILE v_current_date <= v_end_date_only LOOP
                        IF EXTRACT(day FROM v_current_date)::int = ANY(v_rule.days_during) THEN
                            IF v_rule.time_of_day IS NOT NULL THEN
                                IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                                    v_time_array := v_rule.time_of_day;
                                ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                                    v_time_array := ARRAY[v_rule.time_of_day::time];
                                ELSE
                                    v_time_array := ARRAY[]::time[];
                                END IF;

                                FOREACH v_time_of_day IN ARRAY v_time_array
                                LOOP
                                    v_scheduled_time := (
                                        (v_current_date::text || ' ' || v_time_of_day::text)::timestamp
                                        AT TIME ZONE v_effective_timezone
                                    ) AT TIME ZONE 'UTC';

                                    IF v_scheduled_time > v_current_time THEN
                                        RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                                    END IF;
                                END LOOP;
                            END IF;
                        END IF;
                        v_current_date := v_current_date + INTERVAL '1 day';
                    END LOOP;
                END IF;
            ELSE
                v_target_date := v_start_date::date;

                IF v_rule.days_before IS NOT NULL AND array_length(v_rule.days_before, 1) > 0 THEN
                    FOREACH v_days_before IN ARRAY v_rule.days_before
                    LOOP
                        v_current_date := v_target_date - (v_days_before || ' days')::interval;

                        IF v_rule.time_of_day IS NOT NULL THEN
                            IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                                v_time_array := v_rule.time_of_day;
                            ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                                v_time_array := ARRAY[v_rule.time_of_day::time];
                            ELSE
                                v_time_array := ARRAY[]::time[];
                            END IF;

                            FOREACH v_time_of_day IN ARRAY v_time_array
                            LOOP
                                v_scheduled_time := (
                                    (v_current_date::text || ' ' || v_time_of_day::text)::timestamp
                                    AT TIME ZONE v_effective_timezone
                                ) AT TIME ZONE 'UTC';

                                IF v_scheduled_time > v_current_time THEN
                                    RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                                END IF;
                            END LOOP;
                        END IF;
                    END LOOP;
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_framework_targets(uuid) TO authenticated;

COMMENT ON FUNCTION rpc_framework_targets(uuid) IS
    'Generates framework targets for all frequency types. Monthly supports both day_of_month and nth_week+weekday modes. Uses isodow (1=Mon..7=Sun) for day matching to align with the wizard ISO convention.';
