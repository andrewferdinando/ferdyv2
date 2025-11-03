-- Update rpc_push_framework_to_drafts function to include subcategory_id
-- This function creates drafts from framework_targets and includes subcategory_id
--
-- IMPORTANT: Run this in Supabase SQL Editor to update the function
-- 
-- NOTE: This assumes framework_targets is a table/view or comes from rpc_framework_targets
-- If your actual function structure differs, you may need to adjust the SELECT statement
-- and the INSERT INTO drafts statement to match your schema.

CREATE OR REPLACE FUNCTION rpc_push_framework_to_drafts(p_brand_id uuid)
RETURNS integer AS $$
DECLARE
    v_count integer := 0;
    v_framework_targets RECORD;
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
BEGIN
    -- Get brand timezone
    SELECT timezone INTO v_brand_timezone FROM brands WHERE id = p_brand_id;

    IF v_brand_timezone IS NULL THEN
        RAISE EXCEPTION 'Brand not found or timezone not set.';
    END IF;

    -- Loop through framework_targets for the brand
    -- NOTE: Adjust this SELECT based on your actual framework_targets structure
    -- If framework_targets is a view/table, use: FROM framework_targets ft
    -- If it comes from rpc_framework_targets, you may need to call that function differently
    FOR v_framework_targets IN
        SELECT
            ft.id AS framework_target_id,
            ft.scheduled_at,
            ft.category_id,
            ft.subcategory_id,  -- Get subcategory_id from framework_targets
            sr.id AS schedule_rule_id,
            sr.channels,
            sr.time_of_day,
            sr.frequency,
            sr.days_of_week,
            sr.day_of_month,
            sr.start_date,
            sr.end_date,
            sr.days_before,
            sr.days_during
        FROM framework_targets ft
        LEFT JOIN schedule_rules sr ON sr.id = ft.schedule_rule_id
        WHERE ft.brand_id = p_brand_id
        AND ft.is_active = TRUE
        AND ft.scheduled_at > now() - INTERVAL '1 hour'  -- Only consider future or very recent targets
    LOOP
        v_scheduled_at := v_framework_targets.scheduled_at;
        v_category_id := v_framework_targets.category_id;
        v_subcategory_id := v_framework_targets.subcategory_id;  -- Assign subcategory_id
        v_rule_id := v_framework_targets.schedule_rule_id;

        -- Calculate target month and local scheduled time
        v_target_month := date_trunc('month', v_scheduled_at)::date;
        v_scheduled_local := v_scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE v_brand_timezone;

        -- For each channel in the schedule rule (or default to 'instagram' if none)
        FOREACH v_channel IN ARRAY COALESCE(v_framework_targets.channels, ARRAY['instagram'])
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
                    subcategory_id   -- Include subcategory_id from framework_targets
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
                    v_category_id,    -- Use category_id from framework_targets
                    v_subcategory_id  -- Use subcategory_id from framework_targets
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
    'Creates drafts from framework_targets for a brand. Includes subcategory_id from framework_targets. Returns the count of drafts created.';

