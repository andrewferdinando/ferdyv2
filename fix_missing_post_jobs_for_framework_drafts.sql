-- Fix missing post_jobs for framework-created drafts
-- This script will find drafts that should have multiple post_jobs based on their schedule_rules
-- and create the missing post_jobs

-- Step 1: Find drafts with schedule_source = 'framework' that are missing post_jobs
-- For each draft, check its schedule_rule and create missing post_jobs

DO $$
DECLARE
    v_draft RECORD;
    v_rule RECORD;
    v_existing_channels text[];
    v_missing_channels text[];
    v_channel text;
    v_brand_timezone text;
    v_target_month date;
    v_scheduled_local timestamptz;
    v_post_job_id uuid;
    v_channels text[];
BEGIN
    -- Loop through all framework-created drafts
    FOR v_draft IN
        SELECT 
            d.id as draft_id,
            d.brand_id,
            d.scheduled_for,
            d.subcategory_id,
            d.post_job_id,
            COUNT(pj.id) as existing_job_count
        FROM drafts d
        LEFT JOIN post_jobs pj ON pj.draft_id = d.id
        WHERE d.schedule_source = 'framework'
            AND d.scheduled_for > now()  -- Only future drafts
        GROUP BY d.id, d.brand_id, d.scheduled_for, d.subcategory_id, d.post_job_id
        HAVING COUNT(pj.id) < 4  -- Less than 4 jobs (assuming max 4 channels)
    LOOP
        -- Get brand timezone
        SELECT timezone INTO v_brand_timezone 
        FROM brands 
        WHERE id = v_draft.brand_id;
        
        IF v_brand_timezone IS NULL THEN
            CONTINUE;  -- Skip if brand not found
        END IF;
        
        -- Find schedule rule for this draft's subcategory
        SELECT id, channels INTO v_rule
        FROM schedule_rules
        WHERE brand_id = v_draft.brand_id
          AND subcategory_id = v_draft.subcategory_id
          AND is_active = true
        LIMIT 1;
        
        -- If no schedule rule found, skip
        IF v_rule IS NULL OR v_rule.id IS NULL THEN
            RAISE NOTICE 'No schedule rule found for draft % (subcategory_id: %)', v_draft.draft_id, v_draft.subcategory_id;
            CONTINUE;
        END IF;
        
        -- Normalize channels from schedule rule
        IF v_rule.channels IS NOT NULL AND array_length(v_rule.channels, 1) > 0 THEN
            v_channels := ARRAY(
                SELECT CASE 
                    WHEN channel = 'instagram' THEN 'instagram_feed'
                    WHEN channel = 'linkedin' THEN 'linkedin_profile'
                    ELSE channel
                END
                FROM unnest(v_rule.channels) AS channel
            );
        ELSE
            CONTINUE;  -- No channels in rule, skip
        END IF;
        
        -- Get existing channels for this draft
        SELECT ARRAY_AGG(channel) INTO v_existing_channels
        FROM post_jobs
        WHERE draft_id = v_draft.draft_id;
        
        -- Find missing channels
        v_missing_channels := ARRAY(
            SELECT ch
            FROM unnest(v_channels) AS ch
            WHERE ch NOT IN (SELECT unnest(COALESCE(v_existing_channels, ARRAY[]::text[])))
        );
        
        -- If there are missing channels, create post_jobs for them
        IF array_length(v_missing_channels, 1) > 0 THEN
            RAISE NOTICE 'Draft % missing % channels: %', v_draft.draft_id, array_length(v_missing_channels, 1), array_to_string(v_missing_channels, ', ');
            
            -- Calculate target month and local scheduled time
            v_target_month := date_trunc('month', v_draft.scheduled_for)::date;
            v_scheduled_local := v_draft.scheduled_for AT TIME ZONE 'UTC' AT TIME ZONE v_brand_timezone;
            
            -- Create missing post_jobs
            FOREACH v_channel IN ARRAY v_missing_channels
            LOOP
                INSERT INTO post_jobs (
                    brand_id,
                    schedule_rule_id,
                    draft_id,
                    channel,
                    target_month,
                    scheduled_at,
                    scheduled_local,
                    scheduled_tz,
                    status
                ) VALUES (
                    v_draft.brand_id,
                    v_rule.id,
                    v_draft.draft_id,
                    v_channel,
                    v_target_month,
                    v_draft.scheduled_for,
                    v_scheduled_local,
                    v_brand_timezone,
                    'pending'
                ) RETURNING id INTO v_post_job_id;
                
                RAISE NOTICE 'Created post_job % for draft % with channel %', v_post_job_id, v_draft.draft_id, v_channel;
            END LOOP;
        END IF;
    END LOOP;
END $$;

