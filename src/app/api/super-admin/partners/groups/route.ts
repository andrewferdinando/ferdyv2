import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'

export const runtime = 'nodejs'

// Lightweight group picker: returns all groups with their current
// partner_enquiry_id attribution (so UIs can show which groups are already
// taken).
export async function GET(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  // Only groups with a live subscription are eligible for conversion.
  // Incomplete / incomplete_expired means they never finished onboarding,
  // and canceled means they've left — neither should be pickable here.
  let query = supabaseAdmin
    .from('groups')
    .select('id, name, partner_enquiry_id, subscription_status, created_at')
    .in('subscription_status', ['active', 'past_due', 'trialing'])
    .order('created_at', { ascending: false })
    .limit(100)

  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) {
    console.error('[super-admin/partners/groups GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ groups: data ?? [] })
}
