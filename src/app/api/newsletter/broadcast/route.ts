import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-server'
import { sendBroadcast, listBroadcasts } from '@/lib/newsletter/broadcast'
import { getAudienceId } from '@/lib/newsletter/resend'

export const runtime = 'nodejs'

function extractToken(request: NextRequest) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

async function authenticateSuperAdmin(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return null

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const superAdmin = await isSuperAdmin(user.id)
  if (!superAdmin) return null

  return user
}

export async function GET(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const broadcasts = await listBroadcasts()
    return NextResponse.json({ broadcasts })
  } catch (error: any) {
    console.error('[newsletter/broadcast] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { audiences, subject, html, name } = body

    if (!audiences || !Array.isArray(audiences) || audiences.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: audiences (array of "customers" and/or "non_customers")' },
        { status: 400 }
      )
    }

    if (!subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, html' },
        { status: 400 }
      )
    }

    const results = []

    for (const audienceType of audiences) {
      if (audienceType !== 'customers' && audienceType !== 'non_customers') {
        return NextResponse.json(
          { error: `Invalid audience type: ${audienceType}. Must be "customers" or "non_customers"` },
          { status: 400 }
        )
      }

      const audienceId = getAudienceId(audienceType)
      const result = await sendBroadcast({
        audienceId,
        subject,
        html,
        name: name || `${subject} — ${audienceType}`,
      })
      results.push({ audience: audienceType, ...result })
    }

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('[newsletter/broadcast] POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
