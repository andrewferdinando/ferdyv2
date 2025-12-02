-- Create rpc_push_to_drafts_now function
-- This is the single source of truth for pushing framework drafts to the drafts table
-- It ensures the framework exists, logs to runs table, and creates drafts

CREATE OR REPLACE FUNCTION rpc_push_to_drafts_now(p_brand_id uuid)
RETURNS integer AS $$
DECLARE
    v_window RECORD;
    v_start timestamptz;
    v_end timestamptz;
    v_month date;
    v_run_id uuid;
    v_draft_count integer := 0;
BEGIN
    -- Ensure next-month framework exists (if this function exists)
    -- If it doesn't exist, we'll skip this step for now
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
    -- Using 'name' for kind and scope jsonb for target_month
    INSERT INTO runs (brand_id, name, scope, status, started_at)
    VALUES (
        p_brand_id,
        'push_to_drafts',
        jsonb_build_object('target_month', v_month::text),
        'started',
        now()
    )
    RETURNING id INTO v_run_id;
    
    BEGIN
        -- Call rpc_push_framework_to_drafts to create drafts
        -- This function handles creating drafts from framework targets
        SELECT rpc_push_framework_to_drafts(p_brand_id) INTO v_draft_count;
        
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
    'Ensures next-month framework exists, gets the framework window, logs to runs table with target_month, and creates drafts from framework targets. Returns the count of drafts created.';

