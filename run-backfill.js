/**
 * Quick script to run the backfill via API
 * Run with: node run-backfill.js
 * 
 * Or manually call:
 * curl -X POST http://localhost:3000/api/subcategories/backfill-url-summaries
 */

// Check if running in development (localhost) or production
const isDev = process.env.NODE_ENV !== 'production';
const baseUrl = isDev 
  ? 'http://localhost:3000'
  : process.env.NEXT_PUBLIC_SITE_URL || 'https://ferdy.io';

async function runBackfill(brandId) {
  const url = brandId
    ? `${baseUrl}/api/subcategories/backfill-url-summaries?brandId=${brandId}`
    : `${baseUrl}/api/subcategories/backfill-url-summaries`;

  console.log(`Calling: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Backfill completed successfully!');
      console.log(`📊 Processed: ${result.processed || 0} subcategories`);
      console.log(`❌ Errors: ${result.errors || 0}`);
      if (result.message) {
        console.log(`📝 ${result.message}`);
      }
    } else {
      console.error('\n❌ Backfill failed:', result.error || 'Unknown error');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error calling backfill API:', error.message);
    console.log('\n💡 Make sure your Next.js server is running:');
    console.log('   npm run dev');
    process.exit(1);
  }
}

// Get brandId from command line if provided
const brandId = process.argv[2];

if (brandId) {
  console.log(`Running backfill for brand: ${brandId}`);
} else {
  console.log('Running backfill for all brands...');
}

runBackfill(brandId);


