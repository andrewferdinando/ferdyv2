import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const { data: profiles, error } = await supabase
  .from('profiles')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5)

if (error) {
  console.error('Error:', error)
} else {
  console.log('EXISTING PROFILES:')
  console.table(profiles)
  if (profiles && profiles.length > 0) {
    console.log('\nCOLUMNS:', Object.keys(profiles[0]))
  }
}
