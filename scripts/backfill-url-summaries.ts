/**
 * Script to backfill URL summaries for existing subcategories
 * 
 * Run with: npx tsx scripts/backfill-url-summaries.ts [brandId]
 * 
 * This script will:
 * 1. Find all subcategories with a URL but no url_page_summary
 * 2. Fetch and parse each URL
 * 3. Store the summary in the database
 */

import { backfillSubcategoryUrlSummaries } from '../src/server/subcategories/backfillUrlSummaries';

async function main() {
  const brandId = process.argv[2] || undefined;

  console.log('Starting URL summary backfill...');
  if (brandId) {
    console.log(`Filtering to brand: ${brandId}`);
  }

  const result = await backfillSubcategoryUrlSummaries(brandId);

  if (!result.success) {
    console.error('Backfill failed:', result.error);
    process.exit(1);
  }

  console.log(`\nBackfill completed successfully!`);
  console.log(`- Processed: ${result.processed || 0} subcategories`);
  console.log(`- Errors: ${result.errors || 0}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});

