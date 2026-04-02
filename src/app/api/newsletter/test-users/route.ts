import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-server'
import { getTestUsers } from '@/lib/newsletter/test-users'

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
    const testUsers = await getTestUsers()
    return NextResponse.json({ testUsers })
  } catch (error: any) {
    console.error('[newsletter/test-users] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { user_id, is_test_user } = body

    if (!user_id || typeof is_test_user !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, is_test_user (boolean)' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_test_user })
      .eq('user_id', user_id)

    if (error) {
      console.error('[newsletter/test-users] PATCH error:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ success: true, user_id, is_test_user })
  } catch (error: any) {
    console.error('[newsletter/test-users] PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
