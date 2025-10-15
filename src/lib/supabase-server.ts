import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for server-side operations using anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations using service role key
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper to require admin access for a brand
export async function requireAdmin(brandId: string, userId: string) {
  // Check if user is super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (profile?.role === 'super_admin') {
    return true
  }

  // Check if user is brand admin
  const { data: membership } = await supabase
    .from('brand_memberships')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', userId)
    .single()

  return membership?.role === 'admin'
}

// Helper to get session from cookies (for server components)
export async function getServerSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting server session:', error)
    return null
  }
  return session
}
