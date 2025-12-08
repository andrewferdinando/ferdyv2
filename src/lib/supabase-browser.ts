import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

let cookieDomain: string | undefined

try {
  const hostname = new URL(siteUrl).hostname
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'
  const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)

  if (!isLocalhost && !isIpAddress) {
    const parts = hostname.split('.')
    const baseDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname
    cookieDomain = `.${baseDomain}`
  }
} catch (error) {
  console.warn('[supabase-browser] Failed to derive cookie domain from NEXT_PUBLIC_SITE_URL', error)
}

const authOptions: Record<string, unknown> = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
}

if (cookieDomain) {
  authOptions.cookieOptions = {
    domain: cookieDomain,
  }
}

// Only create client if env vars are available (runtime)
// During build time, this will be a placeholder
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: authOptions as Record<string, unknown>,
    })
  : null as any

// Helper to get current session
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  return session
}

// Helper to get current user
export async function getCurrentUser() {
  const session = await getSession()
  return session?.user || null
}
