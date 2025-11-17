import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

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

export async function isSuperAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (error) {
    throw error
  }

  return data?.role === 'super_admin'
}

// Helper to require admin access for a brand
export async function requireAdmin(brandId: string, userId: string) {
  // Check if user is super admin
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (profileError) {
    throw profileError
  }

  if (profile?.role === 'super_admin') {
    return true
  }

  // Check if user is brand admin
  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('brand_memberships')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', userId)
    .single()

  if (membershipError) {
    throw membershipError
  }

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

// Helper to create Supabase client with cookies (for API routes)
// This ensures the client can read the session from request cookies
export async function createSupabaseClientFromRequest() {
  const cookieStore = await cookies()
  
  // Find Supabase auth token cookie (format: sb-<project-ref>-auth-token)
  const supabaseUrlObj = new URL(supabaseUrl)
  const projectRef = supabaseUrlObj.hostname.split('.')[0]
  const authTokenCookieName = `sb-${projectRef}-auth-token`
  
  // Get all cookies as a record
  const cookieMap: Record<string, string> = {}
  cookieStore.getAll().forEach((cookie) => {
    cookieMap[cookie.name] = cookie.value
  })
  
  // Create a client with cookie-based storage
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: {
        getItem: (key: string) => {
          // Supabase looks for these specific keys
          if (key.includes('access-token') || key === authTokenCookieName) {
            return cookieMap[authTokenCookieName] || cookieMap[`sb-${projectRef}-auth-token`] || null
          }
          if (key.includes('refresh-token')) {
            // Refresh token might be in the same cookie or separate
            return cookieMap[authTokenCookieName] || null
          }
          // Try to find any Supabase-related cookie
          const supabaseCookieName = Object.keys(cookieMap).find(k => 
            k.includes('sb-') && (k.includes('auth') || k.includes('token'))
          )
          return supabaseCookieName ? cookieMap[supabaseCookieName] : null
        },
        setItem: () => {}, // No-op for API routes
        removeItem: () => {}, // No-op for API routes
      },
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return client
}
