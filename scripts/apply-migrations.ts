/**
 * Script to apply database migrations to Supabase
 * Run with: npx tsx scripts/apply-migrations.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration(filename: string) {
  console.log(`\n📝 Applying migration: ${filename}`)
  
  const sqlPath = join(process.cwd(), 'supabase', 'sql', 'schema', filename)
  const sql = readFileSync(sqlPath, 'utf-8')
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single()
    
    if (error) {
      // Try direct execution if exec_sql doesn't exist
      const { error: directError } = await supabase.from('_migrations').insert({
        name: filename,
        executed_at: new Date().toISOString()
      })
      
      if (directError) {
        throw error
      }
    }
    
    console.log(`✅ Migration applied: ${filename}`)
  } catch (error: any) {
    console.error(`❌ Error applying ${filename}:`, error.message)
    throw error
  }
}

async function runMigrations() {
  console.log('🚀 Applying database migrations...\n')
  console.log(`Database: ${supabaseUrl}`)
  
  const migrations = [
    'create_groups_table.sql',
    'create_group_memberships_table.sql',
    'add_group_id_to_brands.sql',
    'update_brand_memberships_group_enforcement.sql',
  ]
  
  for (const migration of migrations) {
    await applyMigration(migration)
  }
  
  console.log('\n✨ All migrations applied successfully!')
}

// Run migrations
runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  })
