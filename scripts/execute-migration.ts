/**
 * Execute database migration via direct PostgreSQL connection
 * Run with: npx tsx scripts/execute-migration.ts
 */

import { Client } from 'pg'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

// Extract project ref from URL (e.g., opzmnjkzsmsxusgledap from https://opzmnjkzsmsxusgledap.supabase.co)
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '')

// Construct PostgreSQL connection string
// Format: postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
const connectionString = `postgresql://postgres.${projectRef}:${supabaseServiceKey}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`

async function executeMigration() {
  console.log('🚀 Executing database migration...\n')
  console.log(`Project: ${projectRef}`)
  console.log(`Connecting to database...\n`)
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })
  
  try {
    await client.connect()
    console.log('✅ Connected to database\n')
    
    // Read the migration SQL
    const sqlPath = join(process.cwd(), 'supabase', 'sql', 'schema', '00_groups_system_migration.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    
    console.log('📝 Executing migration SQL...\n')
    
    // Execute the migration
    await client.query(sql)
    
    console.log('✅ Migration executed successfully!\n')
    console.log('📋 Created:')
    console.log('  - groups table')
    console.log('  - group_memberships table')
    console.log('  - group_id column in brands table')
    console.log('  - Updated RLS policies')
    console.log('  - Triggers and functions\n')
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    console.error('\nError details:', error)
    throw error
  } finally {
    await client.end()
    console.log('Disconnected from database')
  }
}

executeMigration()
  .then(() => {
    console.log('\n✨ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
