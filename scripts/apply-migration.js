const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  try {
    const sqlPath = path.join(__dirname, '../supabase/migrations/20250109_fix_create_brand_rpc.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    console.log('Applying migration: 20250109_fix_create_brand_rpc.sql')
    console.log('SQL:', sql.substring(0, 200) + '...')
    
    // Use the Supabase client to execute raw SQL
    const { data, error } = await supabase.rpc('exec', { query: sql })
    
    if (error) {
      console.error('Error applying migration:', error)
      process.exit(1)
    }
    
    console.log('Migration applied successfully!')
    console.log('Result:', data)
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

applyMigration()
