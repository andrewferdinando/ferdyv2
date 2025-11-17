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
    v_first_post_job_id uuid;
    v_channel text;  -- Used in loop for each channel
    v_first_channel text;  -- Will store first channel for draft.channel (backward compatibility)
    v_schedule_rule RECORD;
    v_channels text[];
BEGIN
    -- Get brand timezone
    SELECT timezone INTO v_brand_timezone FROM brands WHERE id = p_brand_id;

    IF v_brand_timezone IS NULL THEN
        RAISE EXCEPTION 'Brand not found or timezone not set.';
    END IF;

    -- Loop through framework targets from rpc_framework_targets function
    -- Only consider future targets to avoid creating duplicates
    -- Explicitly select columns to avoid ambiguity with frequency column
    FOR v_target IN
        SELECT 
            t.scheduled_at,
            t.subcategory_id,
            t.frequency
        FROM rpc_framework_targets(p_brand_id) AS t
        WHERE t.scheduled_at > now()  -- Only future targets (no past or recent past)
    LOOP
        v_scheduled_at := v_target.scheduled_at;
        v_subcategory_id := v_target.subcategory_id;  -- Get subcategory_id from rpc_framework_targets result
        
        -- Get category_id from subcategory if we have a subcategory_id
        v_category_id := NULL;
        IF v_subcategory_id IS NOT NULL THEN
            SELECT category_id INTO v_category_id
            FROM subcategories
            WHERE id = v_subcategory_id;
        END IF;

        -- Find schedule rule for this subcategory if we have one
        v_schedule_rule := NULL;
        v_rule_id := NULL;
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

        -- Determine channels from schedule rule or default to instagram_feed
        v_channels := ARRAY['instagram_feed'];
        IF v_schedule_rule IS NOT NULL AND v_schedule_rule.channels IS NOT NULL AND array_length(v_schedule_rule.channels, 1) > 0 THEN
            -- Normalize channels: replace 'instagram' with 'instagram_feed' (default), 'linkedin' with 'linkedin_profile'
            v_channels := ARRAY(
                SELECT CASE 
                    WHEN channel = 'instagram' THEN 'instagram_feed'
                    WHEN channel = 'linkedin' THEN 'linkedin_profile'
                    ELSE channel
                END
                FROM unnest(v_schedule_rule.channels) AS channel
            );
        END IF;

        -- Get first channel for draft.channel (backward compatibility, not comma-separated)
        v_first_channel := v_channels[1];
        
        -- Safety check: ensure v_first_channel is normalized (in case array is empty or normalization failed)
        v_first_channel := CASE 
            WHEN v_first_channel = 'instagram' THEN 'instagram_feed'
            WHEN v_first_channel = 'linkedin' THEN 'linkedin_profile'
            ELSE COALESCE(v_first_channel, 'instagram_feed')
        END;

        -- Check if a draft already exists for this scheduled_at time
        SELECT id INTO v_draft_id
        FROM drafts
        WHERE brand_id = p_brand_id
          AND scheduled_for = v_scheduled_at
          AND schedule_source = 'framework'
        LIMIT 1;

        IF v_draft_id IS NULL THEN
            -- Create ONE draft first (before post_jobs)
            INSERT INTO drafts (
                brand_id,
                post_job_id,  -- Will be set after first post_job is created
                channel,      -- Store first channel only (not comma-separated)
                scheduled_for,
                scheduled_for_nzt,
                schedule_source,
                publish_status,
                approved,
                created_at,
                subcategory_id   -- Include subcategory_id from rpc_framework_targets
            ) VALUES (
                p_brand_id,
                NULL,  -- Will be set after first post_job is created
                v_first_channel,  -- First channel only
                v_scheduled_at,
                v_scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'Pacific/Auckland',  -- NZT conversion
                'framework',
                'pending',
                false,
                now(),
                v_subcategory_id  -- Use subcategory_id from rpc_framework_targets
            ) RETURNING id INTO v_draft_id;
            
            -- Create ONE post_job per channel, each linked to the draft
            v_first_post_job_id := NULL;
            FOREACH v_channel IN ARRAY v_channels
            LOOP
                INSERT INTO post_jobs (
                    brand_id,
                    schedule_rule_id,
                    draft_id,  -- Link to draft (source of truth)
                    channel,
                    target_month,
                    scheduled_at,
                    scheduled_local,
                    scheduled_tz,
                    status
                ) VALUES (
                    p_brand_id,
                    v_rule_id,
                    v_draft_id,  -- Link to draft
                    v_channel,   -- One channel per post_job
                    v_target_month,
                    v_scheduled_at,
                    v_scheduled_local,
                    v_brand_timezone,
                    'pending'  -- Status will be updated by background job
                ) RETURNING id INTO v_post_job_id;
                
                -- Store first post_job_id for draft.post_job_id (backward compatibility)
                IF v_first_post_job_id IS NULL THEN
                    v_first_post_job_id := v_post_job_id;
                END IF;
            END LOOP;
            
            -- Update draft with first post_job_id (backward compatibility)
            UPDATE drafts
            SET post_job_id = v_first_post_job_id
            WHERE id = v_draft_id;
            
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION rpc_push_framework_to_drafts(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION rpc_push_framework_to_drafts(uuid) IS 
    'Creates ONE draft per scheduled time with all channels stored as comma-separated string. Includes subcategory_id from the framework targets. Returns the count of drafts created.';
