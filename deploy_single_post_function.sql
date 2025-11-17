-- Deploy this function to fix the single post creation issue
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
    v_brand_timezone text;
    v_target_month date;
    v_scheduled_local timestamptz;
    v_channels_text text;
    v_channel text;
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
    
    -- Normalize channels: replace 'instagram' with 'instagram_feed' (default), 'linkedin' with 'linkedin_profile'
    v_channels_text := array_to_string(
        ARRAY(
            SELECT CASE 
                WHEN channel = 'instagram' THEN 'instagram_feed'
                WHEN channel = 'linkedin' THEN 'linkedin_profile'
                ELSE channel
            END
            FROM unnest(p_channels) AS channel
        ),
        ','
    );
    
    -- Create a post_job for the first channel (to satisfy foreign key constraint)
    -- We'll use the first channel for the post_job, but store all channels in the draft
    v_channel := CASE 
        WHEN p_channels[1] = 'instagram' THEN 'instagram_feed'
        WHEN p_channels[1] = 'linkedin' THEN 'linkedin_profile'
        ELSE p_channels[1]
    END;
    
    -- Insert post job with first channel (to satisfy constraint)
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
        NULL,
        v_channel, -- Use first channel for post_job constraint
        v_target_month,
        p_scheduled_at,
        v_scheduled_local,
        v_brand_timezone,
        CASE WHEN p_approve_now THEN 'ready' ELSE 'generated' END
    ) RETURNING id INTO v_post_job_id;
    
    -- Insert single draft with all channels stored as comma-separated string
    INSERT INTO drafts (
        brand_id,
        post_job_id,
        channel,
        copy,
        hashtags,
        asset_ids,
        generated_by,
        approved,
        created_by
    ) VALUES (
        p_brand_id,
        v_post_job_id,
        v_channels_text, -- Store all channels as comma-separated string in draft
        p_copy,
        p_hashtags,
        p_asset_ids,
        'human',
        p_approve_now,
        auth.uid()
    ) RETURNING id INTO v_draft_id;
    
    -- Update post_job to set draft_id (source of truth link)
    UPDATE post_jobs
    SET draft_id = v_draft_id
    WHERE id = v_post_job_id;
    
    RETURN v_draft_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
