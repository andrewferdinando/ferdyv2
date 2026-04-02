import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-server'
import { getAudienceId, listAudienceContacts } from '@/lib/newsletter/resend'

export const runtime = 'nodejs'

function extractToken(request: NextRequest) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export async function GET(request: NextRequest) {
  const token = extractToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const superAdmin = await isSuperAdmin(user.id)
  if (!superAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const audienceId = getAudienceId('customers')
    const contacts = await listAudienceContacts(audienceId)

    return NextResponse.json({
      contacts,
      count: contacts.length,
    })
  } catch (error: any) {
    console.error('[newsletter/customers] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
