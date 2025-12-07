-- NOTE: This file documents the approach for triggering AI summary generation on brand creation.
-- Currently, brands created via admin action (createBrandAction) automatically trigger summary generation.
-- 
-- For brands created via signup trigger, AI summaries can be generated:
-- 1. Lazily when the user views the Brand Details page (user can click "Generate Summary")
-- 2. Via a cron job/webhook that processes new brands with website_url
-- 3. By enhancing the trigger to call the API endpoint using pg_net extension (more complex)
--
-- The trigger function itself doesn't need changes - we just note that summary generation
-- happens asynchronously and doesn't block the signup flow.

-- The existing trigger function (handle_new_user_with_brand) already creates brands correctly.
-- AI summary generation is handled separately to avoid blocking signup.

-- If you want to automatically trigger AI summaries from the database trigger, you would:
-- 1. Enable pg_net extension: CREATE EXTENSION IF NOT EXISTS pg_net;
-- 2. Update the trigger to call: net.http_post(url := 'https://your-domain.com/api/brands/' || v_brand_id || '/generate-summary')
-- 3. Handle errors gracefully (don't fail signup if HTTP call fails)

-- For now, the simpler approach is:
-- - Admin-created brands: Generate summary immediately (via createBrandAction)
-- - Signup-created brands: Generate summary lazily (when user views Brand Details page)

COMMENT ON FUNCTION public.handle_new_user_with_brand() IS 
'Creates user profile and brand on signup. AI summaries can be generated lazily via the Brand Details page or via background jobs.';
