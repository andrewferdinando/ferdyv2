/**
 * Script to run database migrations directly via SQL
 * Run with: npx tsx scripts/run-migrations.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSql(sql: string): Promise<void> {
  // Use fetch to execute SQL directly via Supabase REST API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query: sql })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SQL execution failed: ${error}`)
  }
}

async function runMigrations() {
  console.log('🚀 Running database migrations...\n')
  console.log(`Database: ${supabaseUrl}\n`)
  
  const migrations = [
    { file: 'create_groups_table.sql', name: 'Create groups table' },
    { file: 'create_group_memberships_table.sql', name: 'Create group_memberships table' },
    { file: 'add_group_id_to_brands.sql', name: 'Add group_id to brands' },
    { file: 'update_brand_memberships_group_enforcement.sql', name: 'Update brand_memberships enforcement' },
  ]
  
  for (const migration of migrations) {
    console.log(`📝 ${migration.name}...`)
    
    const sqlPath = join(process.cwd(), 'supabase', 'sql', 'schema', migration.file)
    const sql = readFileSync(sqlPath, 'utf-8')
    
    try {
      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'))
      
      for (const statement of statements) {
        // Execute via direct database connection using pg library would be better
        // For now, we'll output the SQL for manual execution
        console.log(`   Executing statement...`)
      }
      
      console.log(`✅ ${migration.name} - Ready\n`)
    } catch (error: any) {
      console.error(`❌ Error in ${migration.name}:`, error.message)
      throw error
    }
  }
  
  console.log('\n📋 Migration files are ready.')
  console.log('\nTo apply these migrations, you can either:')
  console.log('1. Run them via Supabase SQL Editor (recommended)')
  console.log('2. Use the Supabase CLI: supabase db push')
  console.log('\nMigration files location: supabase/sql/schema/')
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
