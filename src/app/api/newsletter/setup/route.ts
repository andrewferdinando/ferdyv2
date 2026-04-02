import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-server'
import { createAudience } from '@/lib/newsletter/resend'

export const runtime = 'nodejs'

function extractToken(request: NextRequest) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export async function POST(request: NextRequest) {
  try {
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

    // Create both audiences
    const customers = await createAudience('Customers')
    const nonCustomers = await createAudience('Non-customers')

    return NextResponse.json({
      success: true,
      audiences: {
        customers: { id: customers.id, name: customers.name },
        nonCustomers: { id: nonCustomers.id, name: nonCustomers.name },
      },
      instructions: 'Add these IDs as environment variables: RESEND_AUDIENCE_CUSTOMERS and RESEND_AUDIENCE_NON_CUSTOMERS',
    })
  } catch (error: any) {
    console.error('[newsletter/setup] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
