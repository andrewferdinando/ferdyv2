import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin, requireAdmin } from '@/lib/supabase-server'
import { decryptToken } from '@/lib/encryption'
import { revokeProviderAccess } from '@/lib/integrations'
import type { ConnectedAccount, SupportedProvider } from '@/lib/integrations/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function POST(request: Request, context: any) {
  try {
    const provider = context?.params?.provider as SupportedProvider
    if (!['facebook', 'instagram', 'linkedin'].includes(provider)) {
      return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
    }

    const { brandId } = await request.json().catch(() => ({}))
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await requireAdmin(brandId, session.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const providerTargets =
      provider === 'facebook' || provider === 'instagram' ? ['facebook', 'instagram'] : [provider]

    const { data: accounts, error: fetchError } = await supabaseAdmin
      .from('social_accounts')
      .select('provider, account_id, handle, token_encrypted')
      .eq('brand_id', brandId)
      .in('provider', providerTargets)

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (!accounts || !accounts.length) {
      return NextResponse.json({ ok: true })
    }

    for (const account of accounts) {
      if (!account.token_encrypted) {
        continue
      }

      try {
        const decryptedToken = decryptToken(account.token_encrypted)
        const connectedAccount: ConnectedAccount = {
          provider: account.provider as SupportedProvider,
          accountId: account.account_id,
          handle: account.handle,
          accessToken: decryptedToken,
        }
        await revokeProviderAccess(account.provider as SupportedProvider, connectedAccount)
      } catch (error) {
        console.warn('Failed to revoke token for account', account.account_id, error)
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('social_accounts')
      .delete()
      .eq('brand_id', brandId)
      .in('provider', providerTargets)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Integration disconnect error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect account' },
      { status: 500 },
    )
  }
}

