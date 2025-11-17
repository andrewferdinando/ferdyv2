-- Ferdy RPC Functions
-- Add these to Supabase SQL Editor after running the main migration

-- ========================================
-- RPC FUNCTIONS
-- ========================================

-- 1. Create manual post
CREATE OR REPLACE FUNCTION rpc_create_manual_post(
    p_brand_id uuid,
    p_copy text,
    p_hashtags text[],
    p_asset_ids uuid[],
    p_channels text[],
    p_scheduled_at timestamptz,
    p_approve_now boolean DEFAULT false
)
RETURNS uuid[] AS $$
DECLARE
    v_draft_ids uuid[] := '{}';
    v_draft_id uuid;
    v_post_job_id uuid;
    v_first_post_job_id uuid;
    v_channel text;
    v_brand_timezone text;
    v_target_month date;
    v_scheduled_local timestamptz;
    v_normalized_channels text[];
    v_first_channel text;
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
    
    -- DEBUG: Log raw input channels
    RAISE NOTICE 'rpc_create_manual_post: Raw p_channels = %', p_channels;
    
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
    
    -- DEBUG: Log normalized channels
    RAISE NOTICE 'rpc_create_manual_post: Normalized channels = %', v_normalized_channels;
    
    -- Get first channel for draft.channel (backward compatibility)
    v_first_channel := v_normalized_channels[1];
    
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
        created_by
    ) VALUES (
        p_brand_id,
        NULL,  -- Will be set after first post_job is created
        v_first_channel,  -- First channel only
        p_copy,
        p_hashtags,
        p_asset_ids,
        'human',
        p_approve_now,
        auth.uid()
    ) RETURNING id INTO v_draft_id;
    
    -- Create ONE post_job per channel, each linked to the draft
    FOREACH v_channel IN ARRAY v_normalized_channels
    LOOP
        -- DEBUG: Log channel being inserted
        RAISE NOTICE 'rpc_create_manual_post: Inserting post_job with channel = %', v_channel;
        
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
    
    -- Return array with single draft_id (maintains backward compatibility)
    v_draft_ids := array_append(v_draft_ids, v_draft_id);
    
    RETURN v_draft_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create single manual post with multiple channels
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
    
    -- DEBUG: Log raw input channels
    RAISE NOTICE 'rpc_create_single_manual_post: Raw p_channels = %', p_channels;
    
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
    
    -- DEBUG: Log normalized channels
    RAISE NOTICE 'rpc_create_single_manual_post: Normalized channels = %', v_normalized_channels;
    
    -- Get first channel for draft.channel (backward compatibility)
    v_first_channel := v_normalized_channels[1];
    
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
        created_by
    ) VALUES (
        p_brand_id,
        NULL,  -- Will be set after first post_job is created
        v_first_channel,  -- First channel only
        p_copy,
        p_hashtags,
        p_asset_ids,
        'human',
        p_approve_now,
        auth.uid()
    ) RETURNING id INTO v_draft_id;
    
    -- Create ONE post_job per channel, each linked to the draft
    FOREACH v_channel IN ARRAY v_normalized_channels
    LOOP
        -- DEBUG: Log channel being inserted
        RAISE NOTICE 'rpc_create_single_manual_post: Inserting post_job with channel = %', v_channel;
        
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

-- 3. Update draft
CREATE OR REPLACE FUNCTION rpc_update_draft(
    p_draft_id uuid,
    p_copy text,
    p_hashtags text[],
    p_asset_ids uuid[],
    p_channel text,
    p_scheduled_at timestamptz DEFAULT NULL
)
RETURNS drafts AS $$
DECLARE
    v_draft drafts;
    v_post_job_id uuid;
    v_old_channel text;
    v_new_status text;
BEGIN
    -- Get draft with post job info (RLS will ensure user has access)
    SELECT d.*, d.post_job_id INTO v_draft, v_post_job_id
    FROM drafts d
    WHERE d.id = p_draft_id;
    
    IF v_draft.id IS NULL THEN
        RAISE EXCEPTION 'Draft not found';
    END IF;
    
    -- Get old channel
    SELECT channel INTO v_old_channel FROM post_jobs WHERE id = v_post_job_id;
    
    -- Normalize channel: replace 'instagram' with 'instagram_feed' (default), 'linkedin' with 'linkedin_profile'
    p_channel := CASE 
        WHEN p_channel = 'instagram' THEN 'instagram_feed'
        WHEN p_channel = 'linkedin' THEN 'linkedin_profile'
        ELSE p_channel
    END;
    
    -- Update draft
    UPDATE drafts SET
        copy = p_copy,
        hashtags = p_hashtags,
        asset_ids = p_asset_ids,
        channel = p_channel
    WHERE id = p_draft_id;
    
    -- Update post job
    UPDATE post_jobs SET
        channel = p_channel,
        scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
        scheduled_local = CASE 
            WHEN p_scheduled_at IS NOT NULL THEN 
                p_scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE scheduled_tz
            ELSE scheduled_local 
        END
    WHERE id = v_post_job_id;
    
    -- Determine new status based on draft completeness
    IF p_copy IS NOT NULL AND p_copy != '' AND array_length(p_asset_ids, 1) > 0 THEN
        v_new_status := 'ready';
    ELSE
        v_new_status := 'generated';
    END IF;
    
    UPDATE post_jobs SET status = v_new_status WHERE id = v_post_job_id;
    
    -- Return updated draft
    SELECT * INTO v_draft FROM drafts WHERE id = p_draft_id;
    RETURN v_draft;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Approve draft
CREATE OR REPLACE FUNCTION rpc_approve_draft(p_draft_id uuid)
RETURNS drafts AS $$
DECLARE
    v_draft drafts;
    v_post_job_id uuid;
    v_brand_id uuid;
    v_channel text;
    v_social_account_exists boolean;
BEGIN
    -- Get draft with post job info (RLS will ensure user has access)
    SELECT d.*, d.post_job_id, d.brand_id, d.channel 
    INTO v_draft, v_post_job_id, v_brand_id, v_channel
    FROM drafts d
    WHERE d.id = p_draft_id;
    
    IF v_draft.id IS NULL THEN
        RAISE EXCEPTION 'Draft not found';
    END IF;
    
    -- Check if brand has connected social account for this channel
    SELECT EXISTS(
        SELECT 1 FROM social_accounts sa 
        WHERE sa.brand_id = v_brand_id 
        AND sa.channel = v_channel 
        AND sa.status = 'connected'
    ) INTO v_social_account_exists;
    
    IF NOT v_social_account_exists THEN
        RAISE EXCEPTION 'No connected social account found for channel: %', v_channel;
    END IF;
    
    -- Ensure post job has required fields
    IF v_post_job_id IS NULL OR v_channel IS NULL THEN
        RAISE EXCEPTION 'Post job is incomplete';
    END IF;
    
    -- Update draft to approved
    UPDATE drafts SET approved = true WHERE id = p_draft_id;
    
    -- Update post job status to ready
    UPDATE post_jobs SET status = 'ready' WHERE id = v_post_job_id;
    
    -- Return updated draft
    SELECT * INTO v_draft FROM drafts WHERE id = p_draft_id;
    RETURN v_draft;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Delete draft
CREATE OR REPLACE FUNCTION rpc_delete_draft(p_draft_id uuid)
RETURNS void AS $$
DECLARE
    v_post_job_id uuid;
BEGIN
    -- Get post job ID (RLS will ensure user has access)
    SELECT post_job_id INTO v_post_job_id
    FROM drafts
    WHERE id = p_draft_id;
    
    IF v_post_job_id IS NULL THEN
        RAISE EXCEPTION 'Draft not found';
    END IF;
    
    -- Delete draft
    DELETE FROM drafts WHERE id = p_draft_id;
    
    -- Reset post job status to pending
    UPDATE post_jobs SET status = 'pending' WHERE id = v_post_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Upsert schedule rule
CREATE OR REPLACE FUNCTION rpc_upsert_schedule_rule(
    p_id uuid DEFAULT NULL,
    p_brand_id uuid,
    p_name text DEFAULT NULL,
    p_category_id uuid DEFAULT NULL,
    p_subcategory_id uuid DEFAULT NULL,
    p_tone text DEFAULT NULL,
    p_hashtag_rule jsonb DEFAULT NULL,
    p_image_tag_rule jsonb DEFAULT NULL,
    p_frequency text,
    p_times_per_week int DEFAULT NULL,
    p_days_of_week int[] DEFAULT NULL,
    p_day_of_month int DEFAULT NULL,
    p_nth_week int DEFAULT NULL,
    p_weekday int DEFAULT NULL,
    p_time_of_day time DEFAULT NULL,
    p_channels text[] DEFAULT NULL,
    p_timezone text DEFAULT NULL,
    p_is_active boolean DEFAULT true,
    p_first_run_month date DEFAULT NULL,
    p_last_run_month date DEFAULT NULL
)
RETURNS schedule_rules AS $$
DECLARE
    v_rule schedule_rules;
    v_brand_timezone text;
BEGIN
    -- Get brand timezone if not provided
    IF p_timezone IS NULL THEN
        SELECT timezone INTO v_brand_timezone 
        FROM brands 
        WHERE id = p_brand_id;
        
        IF v_brand_timezone IS NULL THEN
            RAISE EXCEPTION 'Brand not found';
        END IF;
        
        p_timezone := v_brand_timezone;
    END IF;
    
    -- Insert or update
    INSERT INTO schedule_rules (
        id, brand_id, name, category_id, subcategory_id, tone,
        hashtag_rule, image_tag_rule, frequency, times_per_week,
        days_of_week, day_of_month, nth_week, weekday, time_of_day,
        channels, timezone, is_active, first_run_month, last_run_month
    ) VALUES (
        COALESCE(p_id, gen_random_uuid()),
        p_brand_id, p_name, p_category_id, p_subcategory_id, p_tone,
        p_hashtag_rule, p_image_tag_rule, p_frequency, p_times_per_week,
        p_days_of_week, p_day_of_month, p_nth_week, p_weekday, p_time_of_day,
        p_channels, p_timezone, p_is_active, p_first_run_month, p_last_run_month
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        category_id = EXCLUDED.category_id,
        subcategory_id = EXCLUDED.subcategory_id,
        tone = EXCLUDED.tone,
        hashtag_rule = EXCLUDED.hashtag_rule,
        image_tag_rule = EXCLUDED.image_tag_rule,
        frequency = EXCLUDED.frequency,
        times_per_week = EXCLUDED.times_per_week,
        days_of_week = EXCLUDED.days_of_week,
        day_of_month = EXCLUDED.day_of_month,
        nth_week = EXCLUDED.nth_week,
        weekday = EXCLUDED.weekday,
        time_of_day = EXCLUDED.time_of_day,
        channels = EXCLUDED.channels,
        timezone = EXCLUDED.timezone,
        is_active = EXCLUDED.is_active,
        updated_at = now()
    RETURNING * INTO v_rule;
    
    RETURN v_rule;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get next asset for LRU rotation
CREATE OR REPLACE FUNCTION get_next_asset_for_subcategory(
    p_brand_id uuid,
    p_subcategory_id uuid,
    p_image_tag_rule jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    v_asset_id uuid;
    v_assets uuid[];
    v_tag_filter text[];
BEGIN
    -- Extract tag filters from image_tag_rule
    IF p_image_tag_rule IS NOT NULL THEN
        SELECT array_agg(tag) INTO v_tag_filter
        FROM jsonb_array_elements_text(p_image_tag_rule->'all');
        
        -- TODO: Also handle 'any' tags with OR logic
    END IF;
    
    -- Get all matching assets
    SELECT array_agg(id) INTO v_assets
    FROM assets a
    WHERE a.brand_id = p_brand_id
    AND (
        p_image_tag_rule IS NULL 
        OR v_tag_filter IS NULL 
        OR v_tag_filter <@ a.tags  -- Contains all required tags
    );
    
    -- If no assets match criteria, get any asset from brand
    IF v_assets IS NULL OR array_length(v_assets, 1) = 0 THEN
        SELECT array_agg(id) INTO v_assets
        FROM assets a
        WHERE a.brand_id = p_brand_id;
    END IF;
    
    -- Return random asset (TODO: Implement proper LRU rotation)
    IF v_assets IS NOT NULL AND array_length(v_assets, 1) > 0 THEN
        v_asset_id := v_assets[floor(random() * array_length(v_assets, 1)) + 1];
    END IF;
    
    RETURN v_asset_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate monthly slots for a schedule rule
CREATE OR REPLACE FUNCTION generate_monthly_slots(
    p_rule schedule_rules,
    p_target_month date
)
RETURNS TABLE(slot_date date, slot_time time) AS $$
DECLARE
    v_month_start date;
    v_month_end date;
    v_current_date date;
    v_day_of_week int;
    v_week_count int;
    v_target_weekday int;
BEGIN
    v_month_start := p_target_month;
    v_month_end := (p_target_month + INTERVAL '1 month - 1 day')::date;
    
    -- Generate slots based on frequency
    IF p_rule.frequency = 'daily' THEN
        -- Every day of the month
        v_current_date := v_month_start;
        WHILE v_current_date <= v_month_end LOOP
            RETURN QUERY SELECT v_current_date, p_rule.time_of_day;
            v_current_date := v_current_date + INTERVAL '1 day';
        END LOOP;
        
    ELSIF p_rule.frequency = 'weekly' THEN
        -- Specific days of week
        v_current_date := v_month_start;
        WHILE v_current_date <= v_month_end LOOP
            v_day_of_week := EXTRACT(dow FROM v_current_date)::int;
            IF v_day_of_week = ANY(p_rule.days_of_week) THEN
                RETURN QUERY SELECT v_current_date, p_rule.time_of_day;
            END IF;
            v_current_date := v_current_date + INTERVAL '1 day';
        END LOOP;
        
    ELSIF p_rule.frequency = 'monthly' THEN
        IF p_rule.day_of_month IS NOT NULL THEN
            -- Specific day of month
            IF p_rule.day_of_month <= EXTRACT(day FROM v_month_end) THEN
                RETURN QUERY SELECT (v_month_start + INTERVAL (p_rule.day_of_month - 1) || ' days')::date, p_rule.time_of_day;
            END IF;
        ELSIF p_rule.nth_week IS NOT NULL AND p_rule.weekday IS NOT NULL THEN
            -- Nth weekday of month
            v_target_weekday := p_rule.weekday;
            v_current_date := v_month_start;
            v_week_count := 0;
            
            -- Find the nth occurrence of the target weekday
            WHILE v_current_date <= v_month_end LOOP
                IF EXTRACT(dow FROM v_current_date)::int = v_target_weekday THEN
                    v_week_count := v_week_count + 1;
                    IF v_week_count = p_rule.nth_week THEN
                        RETURN QUERY SELECT v_current_date, p_rule.time_of_day;
                        EXIT;
                    END IF;
                END IF;
                v_current_date := v_current_date + INTERVAL '1 day';
            END LOOP;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TEAM MANAGEMENT RPC FUNCTIONS
-- ========================================

-- List members with email (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION rpc_list_brand_members(p_brand_id uuid)
RETURNS TABLE(user_id uuid, email text, full_name text, role text, joined_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bm.user_id,
    u.email,
    COALESCE(p.full_name,'') as full_name,
    bm.role,
    bm.created_at as joined_at
  FROM brand_memberships bm
  JOIN auth.users u ON u.id = bm.user_id
  LEFT JOIN profiles p ON p.user_id = bm.user_id
  WHERE bm.brand_id = p_brand_id
    AND (
      user_is_super_admin()
      OR EXISTS (SELECT 1 FROM brand_memberships x WHERE x.brand_id = p_brand_id AND x.user_id = auth.uid())
    );
$$;

-- Change role (admin or super_admin only)
CREATE OR REPLACE FUNCTION rpc_set_member_role(p_brand_id uuid, p_user_id uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_role NOT IN ('admin','editor') THEN
    RAISE EXCEPTION 'Invalid role';
  END IF;

  IF NOT ( user_is_super_admin() OR EXISTS(
    SELECT 1 FROM brand_memberships WHERE brand_id = p_brand_id AND user_id = auth.uid() AND role = 'admin'
  )) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE brand_memberships
  SET role = p_role
  WHERE brand_id = p_brand_id AND user_id = p_user_id;
END;
$$;

-- Remove member (admin or super_admin)
CREATE OR REPLACE FUNCTION rpc_remove_member(p_brand_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT ( user_is_super_admin() OR EXISTS(
    SELECT 1 FROM brand_memberships WHERE brand_id = p_brand_id AND user_id = auth.uid() AND role = 'admin'
  )) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  DELETE FROM brand_memberships
  WHERE brand_id = p_brand_id AND user_id = p_user_id;
END;
$$;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Ferdy RPC functions created successfully!';
    RAISE NOTICE 'Available functions:';
    RAISE NOTICE '- rpc_create_manual_post()';
    RAISE NOTICE '- rpc_update_draft()';
    RAISE NOTICE '- rpc_approve_draft()';
    RAISE NOTICE '- rpc_delete_draft()';
    RAISE NOTICE '- rpc_upsert_schedule_rule()';
    RAISE NOTICE '- rpc_list_brand_members()';
    RAISE NOTICE '- rpc_set_member_role()';
    RAISE NOTICE '- rpc_remove_member()';
END $$;
