import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-server'
import { updateBrandPostInformationFromSocialAccount } from '@/server/brandPostInformation/updateBrandPostInformationFromSocialAccount'

export const runtime = 'nodejs'

function extractToken(request: NextRequest) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export async function POST(request: NextRequest, { params }: { params: { brandId: string } }) {
  try {
    const { brandId } = params
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    const token = extractToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const superAdmin = await isSuperAdmin(user.id)
    if (!superAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: socialAccounts, error: accountsError } = await supabaseAdmin
      .from('social_accounts')
      .select('id, provider, status')
      .eq('brand_id', brandId)
      .in('provider', ['facebook', 'instagram'])
      .eq('status', 'connected')

    if (accountsError) {
      return NextResponse.json({ error: accountsError.message }, { status: 500 })
    }

    if (!socialAccounts || socialAccounts.length === 0) {
      return NextResponse.json({ ok: true, processed: 0 })
    }

    let processed = 0
    for (const account of socialAccounts) {
      try {
        await updateBrandPostInformationFromSocialAccount(account.id)
        processed += 1
      } catch (error) {
        console.error('[post info reanalyse] failed for account', {
          socialAccountId: account.id,
          error: error instanceof Error ? error.message : 'unknown',
        })
      }
    }

    return NextResponse.json({ ok: true, processed })
  } catch (error) {
    console.error('[post info reanalyse] unexpected error', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

