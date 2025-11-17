-- Updated function to include new scheduling fields
-- Copy and paste this into your Supabase SQL Editor and run it

CREATE OR REPLACE FUNCTION rpc_create_single_manual_post(
    p_brand_id uuid,
    p_copy text,
    p_hashtags text[],
    p_asset_ids uuid[],
    p_channels text[],
    p_scheduled_at timestamptz,
    p_approve_now boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
    v_draft_id uuid;
    v_post_job_id uuid;
    v_first_post_job_id uuid;
    v_brand_timezone text;
    v_target_month date;
    v_scheduled_local timestamptz;
    v_channel text;
    v_normalized_channels text[];
    v_first_channel text;
    v_scheduled_for_nzt timestamptz;
BEGIN
    -- Get brand timezone
    SELECT timezone INTO v_brand_timezone 
    FROM brands 
    WHERE id = p_brand_id;
    
    IF v_brand_timezone IS NULL THEN
        RAISE EXCEPTION 'Brand not found';
    END IF;
    
    -- Calculate target month and local scheduled time
    v_target_month := date_trunc('month', p_scheduled_at)::date;
    v_scheduled_local := p_scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE v_brand_timezone;
    
    -- Normalize channels: trim whitespace, lowercase, and map to canonical values
    -- Allowed values: 'facebook', 'instagram_feed', 'instagram_story', 'linkedin_profile', 'tiktok', 'x'
    v_normalized_channels := ARRAY(
        SELECT CASE 
            WHEN LOWER(TRIM(channel)) = 'instagram' THEN 'instagram_feed'
            WHEN LOWER(TRIM(channel)) = 'linkedin' THEN 'linkedin_profile'
            WHEN LOWER(TRIM(channel)) IN ('facebook', 'instagram_feed', 'instagram_story', 'linkedin_profile', 'tiktok', 'x') THEN LOWER(TRIM(channel))
            ELSE LOWER(TRIM(channel))  -- Pass through after trimming/lowercasing (will fail constraint if invalid)
        END
        FROM unnest(p_channels) AS channel
    );
    
    -- Get first channel for draft.channel (backward compatibility)
    v_first_channel := v_normalized_channels[1];
    
    -- Create NZT timestamp for scheduled_for_nzt field (as timestamptz)
    v_scheduled_for_nzt := (p_scheduled_at AT TIME ZONE 'Pacific/Auckland')::timestamptz;
    
    -- Create ONE draft first (before post_jobs)
    INSERT INTO drafts (
        brand_id,
        post_job_id,  -- Will be set after first post_job is created
        channel,      -- Store first channel only (not comma-separated)
        copy,
        hashtags,
        asset_ids,
        generated_by,
        approved,
        created_by,
        scheduled_for,        -- UTC timestamp
        scheduled_for_nzt,    -- NZT timestamp
        schedule_source,      -- 'manual' for manual posts
        scheduled_by,         -- Current user ID
        publish_status        -- Default to null for new posts
    ) VALUES (
        p_brand_id,
        NULL,  -- Will be set after first post_job is created
        v_first_channel,  -- First channel only
        p_copy,
        p_hashtags,
        p_asset_ids,
        'human',
        p_approve_now,
        auth.uid(),
        p_scheduled_at,      -- UTC timestamp
        v_scheduled_for_nzt, -- NZT timestamp
        'manual',            -- Manual scheduling
        auth.uid(),          -- Current user
        NULL                 -- No publish status yet
    ) RETURNING id INTO v_draft_id;
    
    -- Create ONE post_job per channel, each linked to the draft
    FOREACH v_channel IN ARRAY v_normalized_channels
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
            NULL,
            v_draft_id,  -- Link to draft
            v_channel,   -- One channel per post_job
            v_target_month,
            p_scheduled_at,
            v_scheduled_local,
            v_brand_timezone,
            CASE WHEN p_approve_now THEN 'ready' ELSE 'generated' END
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
    
    RETURN v_draft_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
