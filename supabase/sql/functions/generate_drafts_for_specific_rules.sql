-- Function to generate drafts for schedule rules with frequency='specific'
-- This handles both single dates and date ranges
-- Called by cron job or manually to generate drafts for upcoming specific dates

CREATE OR REPLACE FUNCTION generate_drafts_for_specific_rules()
RETURNS TABLE (
  drafts_created int,
  rules_processed int,
  errors text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule RECORD;
  v_created_count int := 0;
  v_rules_processed int := 0;
  v_errors text[] := ARRAY[]::text[];
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_scheduled_time timestamptz;
  v_days_before int;
  v_days_during int;
  v_time_of_day time;
  v_scheduled_for_utc timestamptz;
  v_existing_draft_id uuid;
  v_post_job_id_for_update uuid;
  v_first_post_job_id uuid;
  v_subcategory RECORD;
  v_hashtags text[];
  v_channel text;
  v_normalized_channels text[];
  v_first_channel text;
  v_current_time timestamptz := now();
BEGIN
  -- Loop through all active schedule rules with frequency='specific'
  FOR v_rule IN 
    SELECT 
      sr.*,
      sc.default_hashtags,
      sc.name as subcategory_name,
      sc.detail as subcategory_detail
    FROM schedule_rules sr
    LEFT JOIN subcategories sc ON sc.id = sr.subcategory_id
    WHERE sr.frequency = 'specific'
      AND sr.is_active = true
      AND sr.start_date IS NOT NULL
      AND sr.start_date > v_current_time  -- Only future dates
      AND COALESCE(array_length(sr.time_of_day, 1), 0) > 0  -- Must have at least one time
  LOOP
    BEGIN
      v_rules_processed := v_rules_processed + 1;
      
      -- Get subcategory hashtags
      v_hashtags := COALESCE(v_rule.default_hashtags, ARRAY[]::text[]);
      
      -- Set end_date: if null or equal to start_date, it's a single date
      v_start_date := v_rule.start_date;
      v_end_date := COALESCE(v_rule.end_date, v_start_date);
      
      -- Process days_before: schedule posts X days before start_date
      IF v_rule.days_before IS NOT NULL AND array_length(v_rule.days_before, 1) > 0 THEN
        FOREACH v_days_before IN ARRAY v_rule.days_before
        LOOP
          IF v_days_before < 0 THEN
            CONTINUE;  -- Skip invalid days
          END IF;
          
          -- Calculate the scheduled date (start_date - days_before)
          v_scheduled_time := v_start_date - (v_days_before || ' days')::interval;
          
          -- Skip if scheduled time is in the past
          IF v_scheduled_time <= v_current_time THEN
            CONTINUE;
          END IF;
          
          -- For each time of day, create a draft
          FOREACH v_time_of_day IN ARRAY v_rule.time_of_day
          LOOP
            -- Combine date and time, then convert to UTC using the rule's timezone
            -- We need to construct a timestamptz in the rule's timezone
            -- Method: Create the datetime string and use AT TIME ZONE to convert
            v_scheduled_for_utc := (
              (date_trunc('day', v_scheduled_time) + v_time_of_day) 
              AT TIME ZONE COALESCE(v_rule.timezone, 'UTC')
            ) AT TIME ZONE 'UTC';
            
            -- Skip if the converted time is in the past
            IF v_scheduled_for_utc <= v_current_time THEN
              CONTINUE;
            END IF;
            
            -- Check if draft already exists for this scheduled time (avoid duplicates)
            -- Check by schedule_rule_id and scheduled_for (not by channel, since one draft can have multiple channels)
            SELECT d.id INTO v_existing_draft_id
            FROM drafts d
            JOIN post_jobs pj ON pj.draft_id = d.id
            WHERE d.brand_id = v_rule.brand_id
              AND pj.schedule_rule_id = v_rule.id
              AND d.scheduled_for = v_scheduled_for_utc
              AND d.schedule_source = 'auto'
            LIMIT 1;
            
            -- Normalize channels array
            IF v_rule.channels IS NOT NULL AND array_length(v_rule.channels, 1) > 0 THEN
              v_normalized_channels := ARRAY(
                SELECT CASE 
                  WHEN channel = 'instagram' THEN 'instagram_feed'
                  WHEN channel = 'linkedin' THEN 'linkedin_profile'
                  ELSE channel
                END
                FROM unnest(v_rule.channels) AS channel
              );
              v_first_channel := v_normalized_channels[1];
            ELSE
              -- No channels specified, skip
              CONTINUE;
            END IF;
            
            IF v_existing_draft_id IS NULL THEN
              -- Create ONE draft first (before post_jobs)
              INSERT INTO drafts (
                brand_id,
                post_job_id,  -- Will be set after first post_job is created
                channel,      -- Store first channel only (not comma-separated)
                hashtags,
                scheduled_for,
                scheduled_for_nzt,
                schedule_source,
                publish_status,
                approved,
                created_at,
                subcategory_id
              )
              VALUES (
                v_rule.brand_id,
                NULL,  -- Will be set after first post_job is created
                v_first_channel,  -- First channel only
                v_hashtags,
                v_scheduled_for_utc,
                v_scheduled_for_utc AT TIME ZONE 'Pacific/Auckland',  -- NZT conversion
                'auto',
                'pending',
                false,
                v_current_time,
                v_rule.subcategory_id  -- Include subcategory_id from schedule_rule
              )
              RETURNING id INTO v_existing_draft_id;  -- Store draft_id
              
              v_created_count := v_created_count + 1;
            END IF;
            
            -- Create ONE post_job per channel, each linked to the draft
            v_first_post_job_id := NULL;
            FOREACH v_channel IN ARRAY v_normalized_channels
            LOOP
              -- Check if post_job already exists for this channel
              SELECT id INTO v_post_job_id_for_update
              FROM post_jobs
              WHERE draft_id = v_existing_draft_id
                AND channel = v_channel
              LIMIT 1;
              
              IF v_post_job_id_for_update IS NULL THEN
                -- Create post_job for this channel
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
                )
                VALUES (
                  v_rule.brand_id,
                  v_rule.id,
                  v_existing_draft_id,  -- Link to draft
                  v_channel,   -- One channel per post_job
                  date_trunc('month', v_scheduled_for_utc)::date,
                  v_scheduled_for_utc,
                  v_scheduled_for_utc AT TIME ZONE COALESCE(v_rule.timezone, 'UTC'),
                  COALESCE(v_rule.timezone, 'UTC'),
                  'pending'
                )
                RETURNING id INTO v_post_job_id_for_update;
              END IF;
              
              -- Store first post_job_id for draft.post_job_id (backward compatibility)
              IF v_first_post_job_id IS NULL THEN
                v_first_post_job_id := v_post_job_id_for_update;
              END IF;
            END LOOP;
            
            -- Update draft with first post_job_id (backward compatibility)
            IF v_first_post_job_id IS NOT NULL THEN
              UPDATE drafts
              SET post_job_id = v_first_post_job_id
              WHERE id = v_existing_draft_id;
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
          
          -- Calculate the scheduled date (start_date + days_during)
          v_scheduled_time := v_start_date + (v_days_during || ' days')::interval;
          
          -- Make sure it's within the range [start_date, end_date]
          IF v_scheduled_time < v_start_date OR v_scheduled_time > v_end_date THEN
            CONTINUE;
          END IF;
          
          -- Skip if scheduled time is in the past
          IF v_scheduled_time <= v_current_time THEN
            CONTINUE;
          END IF;
          
          -- For each time of day, create a draft
          FOREACH v_time_of_day IN ARRAY v_rule.time_of_day
          LOOP
            -- Convert to UTC
            v_scheduled_for_utc := (
              (date_trunc('day', v_scheduled_time) + v_time_of_day) 
              AT TIME ZONE COALESCE(v_rule.timezone, 'UTC')
            ) AT TIME ZONE 'UTC';
            
            -- Skip if the converted time is in the past
            IF v_scheduled_for_utc <= v_current_time THEN
              CONTINUE;
            END IF;
            
            -- Check if draft already exists for this scheduled time (avoid duplicates)
            -- Check by schedule_rule_id and scheduled_for (not by channel, since one draft can have multiple channels)
            SELECT d.id INTO v_existing_draft_id
            FROM drafts d
            JOIN post_jobs pj ON pj.draft_id = d.id
            WHERE d.brand_id = v_rule.brand_id
              AND pj.schedule_rule_id = v_rule.id
              AND d.scheduled_for = v_scheduled_for_utc
              AND d.schedule_source = 'auto'
            LIMIT 1;
            
            -- Normalize channels array
            IF v_rule.channels IS NOT NULL AND array_length(v_rule.channels, 1) > 0 THEN
              v_normalized_channels := ARRAY(
                SELECT CASE 
                  WHEN channel = 'instagram' THEN 'instagram_feed'
                  WHEN channel = 'linkedin' THEN 'linkedin_profile'
                  ELSE channel
                END
                FROM unnest(v_rule.channels) AS channel
              );
              v_first_channel := v_normalized_channels[1];
            ELSE
              -- No channels specified, skip
              CONTINUE;
            END IF;
            
            IF v_existing_draft_id IS NULL THEN
              -- Create ONE draft first (before post_jobs)
              INSERT INTO drafts (
                brand_id,
                post_job_id,  -- Will be set after first post_job is created
                channel,      -- Store first channel only (not comma-separated)
                hashtags,
                scheduled_for,
                scheduled_for_nzt,
                schedule_source,
                publish_status,
                approved,
                created_at,
                subcategory_id
              )
              VALUES (
                v_rule.brand_id,
                NULL,  -- Will be set after first post_job is created
                v_first_channel,  -- First channel only
                v_hashtags,
                v_scheduled_for_utc,
                v_scheduled_for_utc AT TIME ZONE 'Pacific/Auckland',
                'auto',
                'pending',
                false,
                v_current_time,
                v_rule.subcategory_id  -- Include subcategory_id from schedule_rule
              )
              RETURNING id INTO v_existing_draft_id;  -- Store draft_id
              
              v_created_count := v_created_count + 1;
            END IF;
            
            -- Create ONE post_job per channel, each linked to the draft
            v_first_post_job_id := NULL;
            FOREACH v_channel IN ARRAY v_normalized_channels
            LOOP
              -- Check if post_job already exists for this channel
              SELECT id INTO v_post_job_id_for_update
              FROM post_jobs
              WHERE draft_id = v_existing_draft_id
                AND channel = v_channel
              LIMIT 1;
              
              IF v_post_job_id_for_update IS NULL THEN
                -- Create post_job for this channel
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
                )
                VALUES (
                  v_rule.brand_id,
                  v_rule.id,
                  v_existing_draft_id,  -- Link to draft
                  v_channel,   -- One channel per post_job
                  date_trunc('month', v_scheduled_for_utc)::date,
                  v_scheduled_for_utc,
                  v_scheduled_for_utc AT TIME ZONE COALESCE(v_rule.timezone, 'UTC'),
                  COALESCE(v_rule.timezone, 'UTC'),
                  'pending'
                )
                RETURNING id INTO v_post_job_id_for_update;
              END IF;
              
              -- Store first post_job_id for draft.post_job_id (backward compatibility)
              IF v_first_post_job_id IS NULL THEN
                v_first_post_job_id := v_post_job_id_for_update;
              END IF;
            END LOOP;
            
            -- Update draft with first post_job_id (backward compatibility)
            IF v_first_post_job_id IS NOT NULL THEN
              UPDATE drafts
              SET post_job_id = v_first_post_job_id
              WHERE id = v_existing_draft_id;
            END IF;
          END LOOP;
        END LOOP;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other rules
      v_errors := array_append(v_errors, 
        format('Error processing rule %s: %s', v_rule.id, SQLERRM));
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_created_count, v_rules_processed, v_errors;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_drafts_for_specific_rules() TO authenticated;

-- Add comment
COMMENT ON FUNCTION generate_drafts_for_specific_rules() IS 
  'Generates drafts for schedule rules with frequency=''specific''. Handles both single dates and date ranges. Converts local times to UTC, prevents duplicates, and only creates future drafts.';

