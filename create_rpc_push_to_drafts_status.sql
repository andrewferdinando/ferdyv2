-- Create rpc_push_to_drafts_status function
-- Returns the status of the next push to drafts operation without creating drafts

CREATE OR REPLACE FUNCTION rpc_push_to_drafts_status(p_brand_id uuid)
RETURNS TABLE (
    target_month date,
    target_month_name text,
    push_date date,
    has_run boolean,
    last_run_at timestamptz
) AS $$
DECLARE
    v_window RECORD;
    v_start timestamptz;
    v_end timestamptz;
    v_month date;
    v_push_date date;
    v_has_run boolean;
    v_last_run_at timestamptz;
BEGIN
    -- Get the next framework window (same logic as rpc_push_to_drafts_now)
    SELECT * INTO v_window
    FROM rpc_next_framework_window(p_brand_id)
    LIMIT 1;
    
    IF v_window IS NULL THEN
        -- Return null values if no window found
        RETURN QUERY SELECT NULL::date, NULL::text, NULL::date, false::boolean, NULL::timestamptz;
        RETURN;
    END IF;
    
    v_start := v_window.start_date;
    v_end := v_window.end_date;
    v_month := date_trunc('month', v_start)::date;
    
    -- Compute push_date as the 15th of the previous month
    -- push_date := (target_month - interval '1 month')::date + interval '14 days'
    v_push_date := (v_month - interval '1 month')::date + interval '14 days';
    
    -- Check if a successful run exists for this target_month
    -- Using kind = 'push_to_drafts' and checking target_month column
    SELECT EXISTS (
        SELECT 1
        FROM runs
        WHERE brand_id = p_brand_id
          AND kind = 'push_to_drafts'
          AND status = 'success'
          AND target_month = v_month
    ) INTO v_has_run;
    
    -- Get the timestamp of the most recent successful push for this target_month
    SELECT max(r.ended_at)
    INTO v_last_run_at
    FROM runs r
    WHERE r.brand_id = p_brand_id
      AND r.kind = 'push_to_drafts'
      AND r.status = 'success'
      AND r.target_month = v_month;
    
    -- Format month name (e.g., 'January')
    RETURN QUERY SELECT
        v_month,
        trim(to_char(v_month, 'Month'))::text,
        v_push_date,
        v_has_run,
        v_last_run_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION rpc_push_to_drafts_status(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION rpc_push_to_drafts_status(uuid) IS 
    'Returns the status of the next push to drafts operation: target_month, target_month_name, push_date (15th of previous month), whether a successful run exists for that target_month, and the timestamp of the most recent successful push (last_run_at).';

