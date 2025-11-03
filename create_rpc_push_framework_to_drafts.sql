-- Update rpc_push_framework_to_drafts function to include subcategory_id
-- This function creates drafts from rpc_framework_targets results and includes subcategory_id
--
-- IMPORTANT: Run this in Supabase SQL Editor to update the function
-- 
-- NOTE: This function uses rpc_framework_targets to get the framework targets data,
-- not a framework_targets table (which doesn't exist).

CREATE OR REPLACE FUNCTION rpc_push_framework_to_drafts(p_brand_id uuid)
RETURNS integer AS $$
DECLARE
    v_count integer := 0;
    v_target RECORD;
    v_target_month date;
    v_scheduled_at timestamptz;
    v_scheduled_local timestamptz;
    v_brand_timezone text;
    v_rule_id uuid;
    v_category_id uuid;
    v_subcategory_id uuid;
    v_draft_id uuid;
    v_post_job_id uuid;
    v_channel text;
    v_schedule_rule RECORD;
    v_channels text[];
BEGIN
    -- Get brand timezone
    SELECT timezone INTO v_brand_timezone FROM brands WHERE id = p_brand_id;

    IF v_brand_timezone IS NULL THEN
        RAISE EXCEPTION 'Brand not found or timezone not set.';
    END IF;

    -- Loop through framework targets from rpc_framework_targets function
    -- We use a temporary table to store the results from the function
    FOR v_target IN
        SELECT * FROM rpc_framework_targets(p_brand_id)
        WHERE scheduled_at > now() - INTERVAL '1 hour'  -- Only consider future or very recent targets
    LOOP
        v_scheduled_at := v_target.scheduled_at;
        v_category_id := v_target.category_id;
        v_subcategory_id := v_target.subcategory_id;  -- Get subcategory_id from rpc_framework_targets result
        v_rule_id := v_target.schedule_rule_id;  -- May be null if not linked to a schedule rule

        -- Find schedule rule for this subcategory if we have one
        v_schedule_rule := NULL;
        IF v_subcategory_id IS NOT NULL THEN
            SELECT id, channels INTO v_schedule_rule
            FROM schedule_rules
            WHERE brand_id = p_brand_id
              AND subcategory_id = v_subcategory_id
              AND is_active = true
            LIMIT 1;
            
            IF v_schedule_rule.id IS NOT NULL THEN
                v_rule_id := v_schedule_rule.id;
            END IF;
        END IF;

        -- Calculate target month and local scheduled time
        v_target_month := date_trunc('month', v_scheduled_at)::date;
        v_scheduled_local := v_scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE v_brand_timezone;

        -- Determine channels from schedule rule or default to instagram
        v_channels := ARRAY['instagram'];
        IF v_schedule_rule IS NOT NULL AND v_schedule_rule.channels IS NOT NULL AND array_length(v_schedule_rule.channels, 1) > 0 THEN
            v_channels := v_schedule_rule.channels;
        END IF;

        -- For each channel
        FOREACH v_channel IN ARRAY v_channels
        LOOP
            -- Check if a post_job already exists for this specific scheduled_at and channel
            SELECT id INTO v_post_job_id
            FROM post_jobs
            WHERE brand_id = p_brand_id
              AND scheduled_at = v_scheduled_at
              AND channel = v_channel
            LIMIT 1;

            IF v_post_job_id IS NULL THEN
                -- Create post_job
                INSERT INTO post_jobs (
                    brand_id,
                    schedule_rule_id,
                    channel,
                    target_month,
                    scheduled_at,
                    scheduled_local,
                    scheduled_tz,
                    status
                ) VALUES (
                    p_brand_id,
                    v_rule_id,
                    v_channel,
                    v_target_month,
                    v_scheduled_at,
                    v_scheduled_local,
                    v_brand_timezone,
                    'pending'  -- Status will be updated by background job
                ) RETURNING id INTO v_post_job_id;
            END IF;

            -- Check if a draft already exists for this post_job
            SELECT id INTO v_draft_id
            FROM drafts
            WHERE post_job_id = v_post_job_id
            LIMIT 1;

            IF v_draft_id IS NULL THEN
                -- Create draft with subcategory_id
                INSERT INTO drafts (
                    brand_id,
                    post_job_id,
                    channel,
                    scheduled_for,
                    scheduled_for_nzt,
                    schedule_source,
                    publish_status,
                    approved,
                    created_at,
                    category_id,      -- Include category_id
                    subcategory_id   -- Include subcategory_id from rpc_framework_targets
                ) VALUES (
                    p_brand_id,
                    v_post_job_id,
                    v_channel,
                    v_scheduled_at,
                    v_scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'Pacific/Auckland',  -- NZT conversion
                    'framework',
                    'pending',
                    false,
                    now(),
                    v_category_id,    -- Use category_id from rpc_framework_targets
                    v_subcategory_id  -- Use subcategory_id from rpc_framework_targets
                );
                v_count := v_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION rpc_push_framework_to_drafts(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION rpc_push_framework_to_drafts(uuid) IS 
    'Creates drafts from rpc_framework_targets results for a brand. Includes subcategory_id from the framework targets. Returns the count of drafts created.';
