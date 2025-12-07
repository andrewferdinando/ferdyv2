-- Update rpc_framework_targets to return brand_id and schedule_rule_id
-- This is needed for rpc_push_to_drafts_now to work with rpc_framework_targets

-- Drop existing function first (in case return type changed)
DROP FUNCTION IF EXISTS rpc_framework_targets(uuid) CASCADE;

-- Recreate with additional columns
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
                                RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
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
                                    RETURN QUERY SELECT p_brand_id, v_rule.id, v_scheduled_time, v_rule.subcategory_id, v_rule_frequency;
                                END IF;
                            END LOOP;
                        END IF;
                        v_target_date := v_target_date + INTERVAL '1 day';
                    END LOOP;
                END IF;

            ELSIF v_rule_frequency = 'monthly' THEN
                -- Handle day_of_month (can be int or int[])
                IF v_rule.day_of_month IS NOT NULL THEN
                    -- Convert day_of_month to array format
                    IF pg_typeof(v_rule.day_of_month) = 'integer[]'::regtype THEN
                        v_day_array := v_rule.day_of_month;
                    ELSIF pg_typeof(v_rule.day_of_month) = 'integer'::regtype THEN
                        v_day_array := ARRAY[v_rule.day_of_month::int];
                    ELSE
                        v_day_array := ARRAY[]::int[];
                    END IF;
                    
                    -- Handle time_of_day as array (it's now time[] type)
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
                            -- Construct target date for this day of month
                            IF v_day_of_month <= EXTRACT(day FROM (v_month_end))::int THEN
                                v_target_date := (v_month_start + (v_day_of_month - 1 || ' days')::interval)::date;
                            ELSE
                                -- Skip if day doesn't exist in this month (e.g., Feb 30)
                                CONTINUE;
                            END IF;
                            
                            -- Process each time of day
                            FOREACH v_time_of_day IN ARRAY v_time_array
                            LOOP
                                -- Construct timestamp in rule's timezone, then convert to UTC
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
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    -- Generate targets for frequency='specific' rules (date-specific and range-specific posts)
    FOR v_rule IN
        SELECT * FROM schedule_rules sr
        WHERE sr.brand_id = p_brand_id
          AND sr.is_active = true
          AND sr.frequency = 'specific'
          AND sr.subcategory_id IS NOT NULL
    LOOP
        v_rule_frequency := 'specific';
        -- Determine effective timezone: use rule's timezone if set, otherwise brand's timezone
        v_effective_timezone := COALESCE(v_rule.timezone, v_brand_timezone);
        
        -- Handle date-specific and range-specific posts
        IF v_rule.start_date IS NOT NULL THEN
            v_start_date := v_rule.start_date;
            
            -- If end_date exists and is different from start_date, it's a range
            IF v_rule.end_date IS NOT NULL AND v_rule.end_date::date != v_rule.start_date::date THEN
                -- Date range: generate targets for days_during
                v_end_date := v_rule.end_date;
                v_start_date_only := v_start_date::date;
                v_end_date_only := v_end_date::date;
                
                -- Handle days_during array
                IF v_rule.days_during IS NOT NULL AND array_length(v_rule.days_during, 1) > 0 THEN
                    v_current_date := v_start_date_only;
                    WHILE v_current_date <= v_end_date_only LOOP
                        IF EXTRACT(day FROM v_current_date)::int = ANY(v_rule.days_during) THEN
                            -- Handle time_of_day as array
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
                -- Single date: generate targets for days_before and the date itself
                v_target_date := v_start_date::date;
                
                -- Handle days_before array
                IF v_rule.days_before IS NOT NULL AND array_length(v_rule.days_before, 1) > 0 THEN
                    FOREACH v_days_before IN ARRAY v_rule.days_before
                    LOOP
                        v_current_date := v_target_date - (v_days_before || ' days')::interval;
                        
                        -- Handle time_of_day as array
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION rpc_framework_targets(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION rpc_framework_targets(uuid) IS 
    'Generates framework targets for all frequency types including date-specific and range-specific posts. Returns brand_id, schedule_rule_id, scheduled_at, subcategory_id, and frequency.';

