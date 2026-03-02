-- Fix: Add terminal status guard to rpc_update_draft and rpc_approve_draft
-- Prevents overwriting post_jobs.status when it's already in a terminal state
-- (success, failed, canceled). This stops user edits from resetting published jobs
-- back to 'ready'/'generated', which could cause duplicate publishes.
--
-- Run this in Supabase SQL Editor.

-- 1. Fix rpc_update_draft: only update post_jobs.status if NOT terminal
CREATE OR REPLACE FUNCTION rpc_update_draft(
    p_draft_id uuid,
    p_copy text,
    p_hashtags text[],
    p_asset_ids uuid[],
    p_channel text,
    p_scheduled_at timestamptz DEFAULT NULL
)
RETURNS drafts AS $fn_update$
DECLARE
    v_draft drafts;
    v_post_job_id uuid;
    v_old_channel text;
    v_new_status text;
BEGIN
    SELECT d.* INTO v_draft
    FROM drafts d
    WHERE d.id = p_draft_id;

    IF v_draft.id IS NULL THEN
        RAISE EXCEPTION 'Draft not found';
    END IF;

    v_post_job_id := v_draft.post_job_id;

    SELECT channel INTO v_old_channel FROM post_jobs WHERE id = v_post_job_id;

    p_channel := CASE
        WHEN p_channel = 'instagram' THEN 'instagram_feed'
        WHEN p_channel = 'linkedin' THEN 'linkedin_profile'
        ELSE p_channel
    END;

    UPDATE drafts SET
        copy = p_copy,
        hashtags = p_hashtags,
        asset_ids = p_asset_ids,
        channel = p_channel
    WHERE id = p_draft_id;

    UPDATE post_jobs SET
        channel = p_channel,
        scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
        scheduled_local = CASE
            WHEN p_scheduled_at IS NOT NULL THEN
                p_scheduled_at AT TIME ZONE 'UTC' AT TIME ZONE scheduled_tz
            ELSE scheduled_local
        END
    WHERE id = v_post_job_id;

    IF p_copy IS NOT NULL AND p_copy != '' AND array_length(p_asset_ids, 1) > 0 THEN
        v_new_status := 'ready';
    ELSE
        v_new_status := 'generated';
    END IF;

    UPDATE post_jobs SET status = v_new_status
    WHERE id = v_post_job_id
      AND status NOT IN ('success', 'failed', 'canceled');

    SELECT * INTO v_draft FROM drafts WHERE id = p_draft_id;
    RETURN v_draft;
END;
$fn_update$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix rpc_approve_draft: only update post_jobs.status if NOT terminal
CREATE OR REPLACE FUNCTION rpc_approve_draft(p_draft_id uuid)
RETURNS drafts AS $fn_approve$
DECLARE
    v_draft drafts;
    v_post_job_id uuid;
    v_brand_id uuid;
    v_channel text;
    v_social_account_exists boolean;
BEGIN
    SELECT d.* INTO v_draft
    FROM drafts d
    WHERE d.id = p_draft_id;

    IF v_draft.id IS NULL THEN
        RAISE EXCEPTION 'Draft not found';
    END IF;

    v_post_job_id := v_draft.post_job_id;
    v_brand_id := v_draft.brand_id;
    v_channel := v_draft.channel;

    SELECT EXISTS(
        SELECT 1 FROM social_accounts sa
        WHERE sa.brand_id = v_brand_id
        AND sa.channel = v_channel
        AND sa.status = 'connected'
    ) INTO v_social_account_exists;

    IF NOT v_social_account_exists THEN
        RAISE EXCEPTION 'No connected social account found for channel: %', v_channel;
    END IF;

    IF v_post_job_id IS NULL OR v_channel IS NULL THEN
        RAISE EXCEPTION 'Post job is incomplete';
    END IF;

    UPDATE drafts SET approved = true WHERE id = p_draft_id;

    UPDATE post_jobs SET status = 'ready'
    WHERE id = v_post_job_id
      AND status NOT IN ('success', 'failed', 'canceled');

    SELECT * INTO v_draft FROM drafts WHERE id = p_draft_id;
    RETURN v_draft;
END;
$fn_approve$ LANGUAGE plpgsql SECURITY DEFINER;
