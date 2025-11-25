-- Create or replace rpc_framework_targets function to include frequency='specific' rules
-- This function generates framework targets for all frequency types including date-specific and range-specific posts
--
-- IMPORTANT: Run this in Supabase SQL Editor to create/update the function

-- Drop dependent view first (if it exists)
DROP VIEW IF EXISTS post_framework_view CASCADE;

-- Drop existing function first (in case return type changed)
DROP FUNCTION IF EXISTS rpc_framework_targets(uuid) CASCADE;

CREATE FUNCTION rpc_framework_targets(p_brand_id uuid)
RETURNS TABLE (
    scheduled_at timestamptz,
    subcategory_id uuid,
    frequency text
) AS $$
DECLARE
    v_rule RECORD;
    v_rule_frequency text;  -- Store frequency to avoid ambiguity
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
    -- Generate targets from current month through next month (2 months total)
    -- This ensures we include dates from today through end of next month
    v_months_to_generate int := 2;
    v_month_offset int;
    v_day_of_month int;  -- For handling day_of_month (could be int or int[])
    v_day_array int[];  -- For handling day_of_month array
    v_start_date_only date;  -- For date range comparison in days_during
    v_end_date_only date;  -- For date range comparison in days_during
    v_brand_timezone text;  -- Brand's timezone (used as fallback)
    v_effective_timezone text;  -- Timezone to use for conversions
BEGIN
    -- Get brand timezone once for the entire function
    SELECT timezone INTO v_brand_timezone
    FROM brands
    WHERE id = p_brand_id;
    
    -- Default to brand timezone if null
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
        v_rule_frequency := v_rule.frequency;  -- Store frequency to avoid ambiguity
        -- Determine effective timezone: use rule's timezone if set, otherwise brand's timezone
        v_effective_timezone := COALESCE(v_rule.timezone, v_brand_timezone);
        -- Generate targets from current month (offset 0) through next month (offset 1)
        -- This ensures we include dates from today through end of next month
        FOR v_month_offset IN 0..(v_months_to_generate - 1) LOOP
            v_current_date := date_trunc('month', CURRENT_DATE) + (v_month_offset || ' months')::interval;
            v_month_start := v_current_date;
            v_month_end := (v_month_start + INTERVAL '1 month - 1 day')::date;

            IF v_rule_frequency = 'daily' THEN
                -- Every day of the month
                -- Handle time_of_day as array (it's now time[] type)
                IF v_rule.time_of_day IS NOT NULL THEN
                    -- Convert time_of_day to array format
                    IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                        v_time_array := v_rule.time_of_day;
                    ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                        v_time_array := ARRAY[v_rule.time_of_day::time];
                    ELSE
                        v_time_array := ARRAY[]::time[];
                    END IF;
                    
                    v_target_date := v_month_start;
                    WHILE v_target_date <= v_month_end LOOP
                        -- Process each time of day
                        FOREACH v_time_of_day IN ARRAY v_time_array
                        LOOP
                            -- Construct timestamp in effective timezone, then convert to UTC
                            v_scheduled_time := (
                                (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                                AT TIME ZONE v_effective_timezone
                            ) AT TIME ZONE 'UTC';
                            
                            IF v_scheduled_time > v_current_time THEN
                                RETURN QUERY SELECT v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                            END IF;
                        END LOOP;
                        v_target_date := v_target_date + INTERVAL '1 day';
                    END LOOP;
                END IF;

            ELSIF v_rule_frequency = 'weekly' THEN
                -- Specific days of week
                IF v_rule.days_of_week IS NOT NULL AND array_length(v_rule.days_of_week, 1) > 0 AND v_rule.time_of_day IS NOT NULL THEN
                    -- Handle time_of_day as array (it's now time[] type)
                    IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                        v_time_array := v_rule.time_of_day;
                    ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                        v_time_array := ARRAY[v_rule.time_of_day::time];
                    ELSE
                        v_time_array := ARRAY[]::time[];
                    END IF;
                    
                    v_target_date := v_month_start;
                    WHILE v_target_date <= v_month_end LOOP
                        v_day_of_week := EXTRACT(dow FROM v_target_date)::int;
                        IF v_day_of_week = ANY(v_rule.days_of_week) THEN
                            -- Process each time of day
                            FOREACH v_time_of_day IN ARRAY v_time_array
                            LOOP
                                -- Construct timestamp in rule's timezone, then convert to UTC
                                v_scheduled_time := (
                                    (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                                    AT TIME ZONE v_effective_timezone
                                ) AT TIME ZONE 'UTC';
                                
                                IF v_scheduled_time > v_current_time THEN
                                    RETURN QUERY SELECT v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                                END IF;
                            END LOOP;
                        END IF;
                        v_target_date := v_target_date + INTERVAL '1 day';
                    END LOOP;
                END IF;

            ELSIF v_rule_frequency = 'monthly' THEN
                IF v_rule.day_of_month IS NOT NULL THEN
                    -- Handle day_of_month - try single int first, then array
                    BEGIN
                        -- Try as single integer first (most common case)
                        v_day_of_month := v_rule.day_of_month::int;
                        IF v_day_of_month > 0 AND v_day_of_month <= EXTRACT(day FROM v_month_end) THEN
                            v_target_date := v_month_start + (v_day_of_month - 1) * INTERVAL '1 day';
                            IF v_rule.time_of_day IS NOT NULL THEN
                                -- Handle time_of_day as array (it's now time[] type)
                                IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                                    v_time_array := v_rule.time_of_day;
                                ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                                    v_time_array := ARRAY[v_rule.time_of_day::time];
                                ELSE
                                    v_time_array := ARRAY[]::time[];
                                END IF;
                                
                                -- Process each time of day
                                FOREACH v_time_of_day IN ARRAY v_time_array
                                LOOP
                                    -- Construct timestamp in effective timezone, then convert to UTC
                                    -- The date + time represents a local time in the effective timezone
                                    v_scheduled_time := (
                                        (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                                        AT TIME ZONE v_effective_timezone
                                    ) AT TIME ZONE 'UTC';
                                    
                                    IF v_scheduled_time > v_current_time THEN
                                        RETURN QUERY SELECT v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                                    END IF;
                                END LOOP;
                            END IF;
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        -- If casting to int failed, try as array
                        BEGIN
                            v_day_array := v_rule.day_of_month;
                            -- Process each day in the array
                            FOREACH v_day_of_month IN ARRAY v_day_array
                            LOOP
                                IF v_day_of_month > 0 AND v_day_of_month <= EXTRACT(day FROM v_month_end) THEN
                                    v_target_date := v_month_start + (v_day_of_month - 1) * INTERVAL '1 day';
                                    IF v_rule.time_of_day IS NOT NULL THEN
                                        -- Handle time_of_day as array (it's now time[] type)
                                        IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                                            v_time_array := v_rule.time_of_day;
                                        ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                                            v_time_array := ARRAY[v_rule.time_of_day::time];
                                        ELSE
                                            v_time_array := ARRAY[]::time[];
                                        END IF;
                                        
                                    -- Process each time of day
                                    FOREACH v_time_of_day IN ARRAY v_time_array
                                    LOOP
                                        -- Construct timestamp in effective timezone, then convert to UTC
                                        v_scheduled_time := (
                                            (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                                            AT TIME ZONE v_effective_timezone
                                        ) AT TIME ZONE 'UTC';
                                        
                                        IF v_scheduled_time > v_current_time THEN
                                            RETURN QUERY SELECT v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                                        END IF;
                                    END LOOP;
                                    END IF;
                                END IF;
                            END LOOP;
                        EXCEPTION WHEN OTHERS THEN
                            -- Skip if we can't handle it
                            NULL;
                        END;
                    END;
                ELSIF v_rule.nth_week IS NOT NULL AND v_rule.weekday IS NOT NULL THEN
                    -- Nth weekday of month
                    v_target_weekday := v_rule.weekday;
                    v_target_date := v_month_start;
                    v_week_count := 0;
                    
                    WHILE v_target_date <= v_month_end LOOP
                        IF EXTRACT(dow FROM v_target_date)::int = v_target_weekday THEN
                            v_week_count := v_week_count + 1;
                            IF v_week_count = v_rule.nth_week THEN
                                IF v_rule.time_of_day IS NOT NULL THEN
                                    -- Handle time_of_day as array (it's now time[] type)
                                    IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
                                        v_time_array := v_rule.time_of_day;
                                    ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
                                        v_time_array := ARRAY[v_rule.time_of_day::time];
                                    ELSE
                                        v_time_array := ARRAY[]::time[];
                                    END IF;
                                    
                                    -- Process each time of day
                                    FOREACH v_time_of_day IN ARRAY v_time_array
                                    LOOP
                                        -- Construct timestamp in effective timezone, then convert to UTC
                                        v_scheduled_time := (
                                            (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                                            AT TIME ZONE v_effective_timezone
                                        ) AT TIME ZONE 'UTC';
                                        
                                        IF v_scheduled_time > v_current_time THEN
                                            RETURN QUERY SELECT v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                                        END IF;
                                    END LOOP;
                                END IF;
                                EXIT;
                            END IF;
                        END IF;
                        v_target_date := v_target_date + INTERVAL '1 day';
                    END LOOP;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    -- Generate targets for frequency='specific' (date-specific and range-specific posts)
    -- Note: We check start_date > v_current_time in the WHERE clause, but we also handle
    -- days_before which can create targets before start_date, so we filter those out later
    FOR v_rule IN
        SELECT * FROM schedule_rules sr
        WHERE sr.brand_id = p_brand_id
          AND sr.is_active = true
          AND sr.frequency = 'specific'
          AND sr.subcategory_id IS NOT NULL
          AND sr.start_date IS NOT NULL
          AND sr.time_of_day IS NOT NULL  -- Must have at least one time
    LOOP
        v_rule_frequency := v_rule.frequency;  -- Store frequency to avoid ambiguity
        -- Determine effective timezone: use rule's timezone if set, otherwise brand's timezone
        v_effective_timezone := COALESCE(v_rule.timezone, v_brand_timezone);
        v_start_date := v_rule.start_date;
        v_end_date := COALESCE(v_rule.end_date, v_start_date);
        
        -- Handle time_of_day as array (for specific frequency)
        IF pg_typeof(v_rule.time_of_day) = 'time[]'::regtype THEN
            v_time_array := v_rule.time_of_day;
        ELSIF pg_typeof(v_rule.time_of_day) = 'time'::regtype THEN
            v_time_array := ARRAY[v_rule.time_of_day::time];
        ELSE
            v_time_array := ARRAY[]::time[];
        END IF;

        -- Process days_before: schedule posts X days before start_date
        IF v_rule.days_before IS NOT NULL AND array_length(v_rule.days_before, 1) > 0 THEN
            FOREACH v_days_before IN ARRAY v_rule.days_before
            LOOP
                IF v_days_before < 0 THEN
                    CONTINUE;  -- Skip invalid days
                END IF;
                
                -- Calculate the scheduled date (date part of start_date - days_before)
                -- Use date_trunc to get just the date, then subtract days
                -- Get effective timezone for this rule
                v_effective_timezone := COALESCE(v_rule.timezone, v_brand_timezone);
                v_target_date := (date_trunc('day', v_start_date) AT TIME ZONE v_effective_timezone)::date;
                v_target_date := v_target_date - (v_days_before || ' days')::interval;
                
                -- For each time of day, generate a target
                FOREACH v_time_of_day IN ARRAY v_time_array
                LOOP
                    -- Construct timestamp in effective timezone, then convert to UTC
                    v_scheduled_time := (
                        (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                        AT TIME ZONE v_effective_timezone
                    ) AT TIME ZONE 'UTC';
                    
                    -- Skip if the converted time is in the past
                    IF v_scheduled_time > v_current_time THEN
                        RETURN QUERY SELECT v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                    END IF;
                END LOOP;
            END LOOP;
        END IF;
        
        -- Process days_during: schedule posts X days after start_date (only for ranges)
        IF v_rule.end_date IS NOT NULL 
          AND v_rule.end_date > v_rule.start_date  -- It's a range
          AND v_rule.days_during IS NOT NULL 
          AND array_length(v_rule.days_during, 1) > 0 
        THEN
            FOREACH v_days_during IN ARRAY v_rule.days_during
            LOOP
                IF v_days_during < 0 THEN
                    CONTINUE;  -- Skip invalid days
                END IF;
                
                -- Calculate the scheduled date (date part of start_date + days_during)
                -- Get effective timezone for this rule
                v_effective_timezone := COALESCE(v_rule.timezone, v_brand_timezone);
                v_target_date := (date_trunc('day', v_start_date) AT TIME ZONE v_effective_timezone)::date;
                v_target_date := v_target_date + (v_days_during || ' days')::interval;
                
                -- Make sure it's within the range [start_date, end_date]
                -- Get date parts in the effective timezone for comparison
                v_start_date_only := (date_trunc('day', v_start_date) AT TIME ZONE v_effective_timezone)::date;
                v_end_date_only := (date_trunc('day', v_end_date) AT TIME ZONE v_effective_timezone)::date;
                
                IF v_target_date < v_start_date_only OR v_target_date > v_end_date_only THEN
                    CONTINUE;
                END IF;
                
                -- For each time of day, generate a target
                FOREACH v_time_of_day IN ARRAY v_time_array
                LOOP
                    -- Construct timestamp in effective timezone, then convert to UTC
                    v_scheduled_time := (
                        (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                        AT TIME ZONE v_effective_timezone
                    ) AT TIME ZONE 'UTC';
                    
                    -- Skip if the converted time is in the past
                    IF v_scheduled_time > v_current_time THEN
                        RETURN QUERY SELECT v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                    END IF;
                END LOOP;
            END LOOP;
        END IF;
        
        -- Also generate targets for the start_date itself if no days_before or days_during specified
        -- (This handles the case where someone wants a post on the exact start_date)
        IF (v_rule.days_before IS NULL OR array_length(v_rule.days_before, 1) = 0)
          AND (v_rule.days_during IS NULL OR array_length(v_rule.days_during, 1) = 0)
        THEN
            -- Get the date part of start_date in the effective timezone
            v_effective_timezone := COALESCE(v_rule.timezone, v_brand_timezone);
            v_target_date := (date_trunc('day', v_start_date) AT TIME ZONE v_effective_timezone)::date;
            
            FOREACH v_time_of_day IN ARRAY v_time_array
            LOOP
                -- Construct timestamp in effective timezone, then convert to UTC
                v_scheduled_time := (
                    (v_target_date::text || ' ' || v_time_of_day::text)::timestamp
                    AT TIME ZONE v_effective_timezone
                ) AT TIME ZONE 'UTC';
                
                -- Skip if the converted time is in the past
                IF v_scheduled_time > v_current_time THEN
                    RETURN QUERY SELECT v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION rpc_framework_targets(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION rpc_framework_targets(uuid) IS 
    'Generates framework targets for all schedule rules (daily, weekly, monthly, and specific date/range) from current month through next month. Returns scheduled_at, subcategory_id, and frequency for each target. Only returns future targets (scheduled_at > now()).';

