# Published At Tracking Task - Summary

## Goal
Fix the Published tab to display the actual publish date instead of the scheduled date, especially for posts published via "Approve & Publish Now".

## Work Completed

### 1. Database Migrations
- **`add_published_at_to_drafts.sql`**: Adds `published_at` column to `drafts` table with backfill for existing published posts
- **`add_published_at_to_post_jobs.sql`**: Adds `published_at` column to `post_jobs` table (optional per-job timestamp)

### 2. Server-Side Changes
- **`src/server/publishing/publishDueDrafts.ts`**:
  - Updated `updateDraftStatusFromJobs()` to set `draft.published_at = now()` when draft becomes `published` or `partially_published`
  - Only sets `published_at` if it's NULL (doesn't overwrite existing value)

- **`src/server/publishing/publishJob.ts`**:
  - Updated `publishJob()` to set `post_jobs.published_at = now()` when a job succeeds
  - Only sets `published_at` if it's NULL

### 3. UI Changes
- **`src/hooks/usePublished.ts`**:
  - Fetches `publishes` table data separately and merges with drafts
  - Uses `publishes.published_at` or `publishes.created_at` as fallback
  - Orders by `published_at` (reverted to `scheduled_for` until migration is run)

- **`src/components/schedule/DraftCard.tsx`**:
  - Updated date display logic to prioritize: `draft.published_at` → `draft.publishes?.published_at` → `draft.scheduled_for`
  - Updated interface to accept `null` values for compatibility

- **`src/app/(dashboard)/brands/[brandId]/schedule/page.tsx`**:
  - Updated sorting to use `draft.published_at` with fallback to `scheduled_for`
  - Added null checks for `publishes` data
  - Updated interface to allow `publishes` to be `null`

### 4. Bug Fixes
- Fixed TypeScript errors for `null` vs `undefined` type compatibility
- Fixed query ordering to avoid errors when `published_at` column doesn't exist yet

## Current Status
- Code changes are complete and pushed to GitHub
- Database migrations need to be run in Supabase:
  1. Run `add_published_at_to_drafts.sql` (REQUIRED)
  2. Run `add_published_at_to_post_jobs.sql` (OPTIONAL)

## Known Issues / Potential Problems

### Issue: Published dates still showing scheduled dates
**Possible causes:**
1. **Migration not run**: `draft.published_at` column doesn't exist yet, so it's always NULL
2. **publishes.published_at is NULL**: Some publishes records might not have `published_at` set (though code sets it on success)
3. **Query not finding publishes**: The query filters by `status: 'success'` - if publishes use different status, they won't be found
4. **Fallback chain not working**: The fallback logic might not be executing correctly

### Next Steps to Debug
1. **Check if migration has been run**: Query the database to see if `published_at` column exists
2. **Check publishes data**: Query `publishes` table to see if records have `published_at` populated
3. **Add console logging**: Add logging in `usePublished` hook to see what data is being fetched
4. **Verify publish flow**: Check that the server-side code is actually setting `published_at` when publishing

### Fallback Chain (Current Implementation)
For published posts, the date display uses this priority:
1. `draft.published_at` (from drafts table - set by migration/server code)
2. `draft.publishes?.published_at` (from publishes table - set when publish succeeds)
3. `draft.publishes?.created_at` (fallback if published_at is NULL)
4. `draft.scheduled_for` (legacy fallback)
5. `draft.post_jobs?.scheduled_at` (secondary legacy fallback)
6. `draft.created_at` (final fallback)

