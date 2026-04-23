import type { NextRequest } from 'next/server'
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-server'

export function extractBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

/**
 * Authenticates the request as a super admin. Returns the user on success,
 * null on failure. API routes should respond with 403 on null.
 */
export async function authenticateSuperAdmin(request: NextRequest) {
  const token = extractBearerToken(request)
  if (!token) return null

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) return null

  const superAdmin = await isSuperAdmin(user.id)
  if (!superAdmin) return null

  return user
}
