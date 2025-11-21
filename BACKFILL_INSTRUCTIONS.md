# Backfill URL Summaries for Subcategories

This document explains how to backfill the `url_page_summary` field for existing subcategories.

## Option 1: Using the API Endpoint (Recommended)

The backfill can be triggered via the API endpoint:

### For all brands:
```bash
curl -X POST https://your-domain.com/api/subcategories/backfill-url-summaries
```

### For a specific brand:
```bash
curl -X POST "https://your-domain.com/api/subcategories/backfill-url-summaries?brandId=YOUR_BRAND_ID"
```

### Response:
```json
{
  "success": true,
  "processed": 5,
  "errors": 0,
  "message": "Processed 5 subcategories"
}
```

## Option 2: Using Supabase SQL Editor

If you prefer to run it manually via SQL, you can check which subcategories need backfilling:

```sql
-- Check subcategories that need backfilling
SELECT 
  id,
  name,
  url,
  brand_id,
  category_id
FROM subcategories
WHERE url IS NOT NULL 
  AND url != ''
  AND (url_page_summary IS NULL OR url_page_summary = '');
```

Then use the API endpoint or wait for the automatic refresh when subcategories are updated.

## Option 3: Manual Update via Form

Any time you edit a subcategory that has a URL, the system will automatically refresh the summary.

## Notes

- The backfill process is rate-limited (1 second delay every 10 items) to avoid overwhelming external servers
- Errors are logged but don't stop the process
- Failed URLs will be skipped automatically
- You can run the backfill multiple times safely (it will only process subcategories that need it)


