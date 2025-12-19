# Delete Brand Data Scripts

This directory contains scripts to completely remove all data for a specific brand, including database records and storage files.

## Prerequisites

1. **Environment Variables**: Make sure you have these set in your `.env.local` file:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

2. **Dependencies**: Install `tsx` if you haven't already:
   ```bash
   npm install -g tsx
   # or
   pnpm add -g tsx
   ```

## Usage

### Step 1: Delete Database Records

Run the SQL script in your Supabase SQL editor:

1. Open Supabase Dashboard → SQL Editor
2. Copy the contents of `delete_brand_data.sql`
3. Paste and execute
4. Verify all counts are 0 in the verification query

**Brand ID**: `14214424-7951-460f-ac99-4a59e79c80ab`

### Step 2: Delete Storage Files

Run the TypeScript script from your project root:

```bash
# Option 1: Pass brand ID as argument
npx tsx scripts/delete-brand-storage.ts 14214424-7951-460f-ac99-4a59e79c80ab

# Option 2: Use environment variable
BRAND_ID=14214424-7951-460f-ac99-4a59e79c80ab npx tsx scripts/delete-brand-storage.ts
```

The script will:
- List all files in `brands/{brandId}/` and `videos/{brandId}/` directories
- Delete them in batches
- Show a summary of deleted files

## What Gets Deleted

### Database Tables:
- `publishes`
- `post_jobs`
- `drafts`
- `event_occurrences`
- `asset_tags`
- `schedule_rules`
- `tags`
- `subcategories`
- `categories`
- `assets`
- `content_preferences`

### Storage Files:
- `brands/{brandId}/originals/*` (all image files)
- `brands/{brandId}/thumbnails/*` (video thumbnails)
- `videos/{brandId}/*` (all video files)

## Safety

⚠️ **WARNING**: These scripts permanently delete data. Make sure you:
- Have backups if needed
- Double-check the brand ID before running
- Run the database deletion first, then storage deletion

## Troubleshooting

If you get permission errors:
- Make sure `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- The service role key has full access to storage and database

If files aren't found:
- Check that the brand ID is correct
- Verify files exist in Supabase Storage dashboard


