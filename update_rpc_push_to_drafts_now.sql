-- Update rpc_push_to_drafts_now to use rpc_framework_targets instead of framework_instances
-- This function ensures next-month framework exists, gets the framework window,
-- logs to runs table, and creates drafts from framework targets

-- Drop existing function first (in case return type changed)
DROP FUNCTION IF EXISTS rpc_push_to_drafts_now(uuid) CASCADE;

CREATE OR REPLACE FUNCTION rpc_push_to_drafts_now(p_brand_id uuid)
RETURNS integer AS $$
DECLARE
    v_window RECORD;
    v_start timestamptz;
    v_end timestamptz;
    v_month date;
    v_run_id uuid;
    v_draft_count integer := 0;
    v_target RECORD;
    v_target_month date;
    v_scheduled_local timestamptz;
    v_brand_timezone text;
    v_draft_id uuid;
    v_post_job_id uuid;
    v_first_post_job_id uuid;
    v_schedule_rule RECORD;
    v_channels text[];
    v_channel text;
    v_first_channel text;
    v_asset_id uuid;
BEGIN
    -- Ensure next-month framework exists (if this function exists)
    BEGIN
        PERFORM rpc_generate_next_month_framework(p_brand_id);
    EXCEPTION WHEN undefined_function THEN
        -- Function doesn't exist, continue without it
        NULL;
    END;
    
    -- Get the next framework window
    SELECT * INTO v_window
    FROM rpc_next_framework_window(p_brand_id)
    LIMIT 1;
    
    IF v_window IS NULL THEN
        RAISE EXCEPTION 'No framework window found for brand %', p_brand_id;
    END IF;
    
    v_start := v_window.start_date;
    v_end := v_window.end_date;
    v_month := date_trunc('month', v_start)::date;
    
    -- Create a run record for tracking
    INSERT INTO runs (brand_id, kind, target_month, status, started_at)
    VALUES (
        p_brand_id,
        'push_to_drafts',
        v_month,
        'started',
        now()
    )
    RETURNING id INTO v_run_id;
    
    BEGIN
        -- Get brand timezone
        SELECT timezone INTO v_brand_timezone FROM brands WHERE id = p_brand_id;
        
        IF v_brand_timezone IS NULL THEN
            RAISE EXCEPTION 'Brand not found or timezone not set.';
        END IF;
        
        -- Loop through framework targets using CTE pattern with rpc_framework_targets
        -- This replaces the old framework_instances table reference
        FOR v_target IN
            WITH fi AS (
                SELECT
                    t.brand_id,
                    t.schedule_rule_id,
                    t.subcategory_id,
                    t.scheduled_at::timestamptz
                FROM rpc_framework_targets(p_brand_id) AS t
                WHERE t.scheduled_at::date >= v_start::date
                  AND t.scheduled_at::date <= v_end::date
            ),
            chosen_assets AS (
                SELECT
                    fi.brand_id,
                    fi.schedule_rule_id,
                    fi.subcategory_id,
                    fi.scheduled_at,
                    rpc_pick_asset_for_rule(fi.schedule_rule_id) AS asset_id
                FROM fi
            )
            SELECT * FROM chosen_assets
            WHERE NOT EXISTS (
                SELECT 1
                FROM drafts d
                WHERE d.brand_id = chosen_assets.brand_id
                  AND d.scheduled_for = chosen_assets.scheduled_at
                  AND d.schedule_source = 'framework'
            )
        LOOP
            -- Get schedule rule for channels
            SELECT id, channels INTO v_schedule_rule
            FROM schedule_rules
            WHERE id = v_target.schedule_rule_id
              AND is_active = true
            LIMIT 1;
            
            -- Determine channels from schedule rule or default to instagram_feed
            v_channels := ARRAY['instagram_feed'];
            IF v_schedule_rule.id IS NOT NULL AND v_schedule_rule.channels IS NOT NULL AND array_length(v_schedule_rule.channels, 1) > 0 THEN
                v_channels := ARRAY(
                    SELECT CASE 
                        WHEN channel = 'instagram' THEN 'instagram_feed'
                        WHEN channel = 'linkedin' THEN 'linkedin_profile'
                        ELSE channel
                    END
                    FROM unnest(v_schedule_rule.channels) AS channel
                );
            END IF;
            
            v_first_channel := v_channels[1];
            v_first_channel := CASE 
                WHEN v_first_channel = 'instagram' THEN 'instagram_feed'
                WHEN v_first_channel = 'linkedin' THEN 'linkedin_profile'
                ELSE COALESCE(v_first_channel, 'instagram_feed')
            END;
            
            -- Calculate target month and local scheduled time
            v_target_month := date_trunc('month', v_target.scheduled_at)::date;
            v_scheduled_local := v_target.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE v_brand_timezone;
            
            -- Create draft
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
                subcategory_id,
                asset_ids
            ) VALUES (
                v_target.brand_id,
                NULL,
                v_first_channel,
                v_target.scheduled_at,
                v_target.scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE 'Pacific/Auckland',
                'framework',
                'pending',
                false,
                now(),
                v_target.subcategory_id,
                CASE WHEN v_target.asset_id IS NOT NULL THEN ARRAY[v_target.asset_id] ELSE ARRAY[]::uuid[] END
            ) RETURNING id INTO v_draft_id;
            
            -- Create post_jobs for each channel
            v_first_post_job_id := NULL;
            FOREACH v_channel IN ARRAY v_channels
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
                    v_target.brand_id,
                    v_target.schedule_rule_id,
                    v_draft_id,
                    v_channel,
                    v_target_month,
                    v_target.scheduled_at,
                    v_scheduled_local,
                    v_brand_timezone,
                    'pending'
                ) RETURNING id INTO v_post_job_id;
                
                IF v_first_post_job_id IS NULL THEN
                    v_first_post_job_id := v_post_job_id;
                END IF;
            END LOOP;
            
            -- Update draft with first post_job_id
            UPDATE drafts
            SET post_job_id = v_first_post_job_id
            WHERE id = v_draft_id;
            
            v_draft_count := v_draft_count + 1;
        END LOOP;
        
        -- Update run status to success
        UPDATE runs
        SET status = 'success', ended_at = now()
        WHERE id = v_run_id;
        
        RETURN v_draft_count;
        
    EXCEPTION WHEN OTHERS THEN
        -- Update run status to failed
        UPDATE runs
        SET status = 'failed', ended_at = now()
        WHERE id = v_run_id;
        
        RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION rpc_push_to_drafts_now(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION rpc_push_to_drafts_now(uuid) IS 
    'Ensures next-month framework exists, gets the framework window, logs to runs table with target_month, and creates drafts from framework targets using rpc_framework_targets. Returns the count of drafts created.';
