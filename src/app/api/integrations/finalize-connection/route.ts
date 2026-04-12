import { NextResponse } from 'next/server'
import { supabaseAdmin, requireAdmin } from '@/lib/supabase-server'
import { encryptToken, decryptToken } from '@/lib/encryption'
import { fetchInstagramAccount } from '@/lib/integrations/facebook'
import { refreshCrossBrandTokens } from '@/lib/integrations/crossBrandRefresh'
import { updateBrandPostInformationFromSocialAccount } from '@/server/brandPostInformation/updateBrandPostInformationFromSocialAccount'
import type { FacebookPageData } from '@/lib/integrations/types'

export const runtime = 'nodejs'

function extractToken(request: Request) {
  const header = request.headers.get('Authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

export async function POST(request: Request) {
  try {
    const token = extractToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { pendingId, selectedPageId } = await request.json().catch(() => ({}))
    if (!pendingId || !selectedPageId) {
      return NextResponse.json({ error: 'pendingId and selectedPageId are required' }, { status: 400 })
    }

    // Lazy cleanup of expired records
    await supabaseAdmin
      .from('pending_oauth_connections')
      .delete()
      .lt('expires_at', new Date().toISOString())

    // Fetch pending record
    const { data: pending, error: fetchError } = await supabaseAdmin
      .from('pending_oauth_connections')
      .select('*')
      .eq('id', pendingId)
      .single()

    if (fetchError || !pending) {
      return NextResponse.json(
        { error: 'Connection request not found or expired. Please reconnect your Facebook account.' },
        { status: 404 },
      )
    }

    // Validate ownership and expiry
    if (pending.user_id !== userData.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (new Date(pending.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Connection request has expired. Please reconnect your Facebook account.' },
        { status: 410 },
      )
    }

    // Verify admin access to brand
    const hasAccess = await requireAdmin(pending.brand_id, userData.user.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Decrypt all pages
    const allPages: FacebookPageData[] = JSON.parse(decryptToken(pending.pages_encrypted))

    // Find selected page
    const selectedPage = allPages.find(p => p.id === selectedPageId)
    if (!selectedPage) {
      return NextResponse.json({ error: 'Selected page not found in available pages.' }, { status: 400 })
    }

    console.log('[finalize-connection] Selected page:', {
      pageId: selectedPage.id,
      pageName: selectedPage.name,
      brandId: pending.brand_id,
    })

    // Build connected accounts from selected page
    const targetProviders: string[] = ['facebook']

    // Delete old social_accounts for this brand
    await supabaseAdmin
      .from('social_accounts')
      .delete()
      .eq('brand_id', pending.brand_id)
      .in('provider', ['facebook', 'instagram'])

    const nowIso = new Date().toISOString()

    // Save Facebook account
    const { data: fbUpserted, error: fbError } = await supabaseAdmin
      .from('social_accounts')
      .upsert(
        {
          brand_id: pending.brand_id,
          provider: 'facebook',
          account_id: selectedPage.id,
          handle: selectedPage.name,
          token_encrypted: encryptToken(selectedPage.access_token),
          refresh_token_encrypted: null,
          token_expires_at: null,
          status: 'connected',
          connected_by_user_id: userData.user.id,
          last_refreshed_at: nowIso,
          metadata: {
            pageId: selectedPage.id,
            pageName: selectedPage.name,
            instagramBusinessAccountId: selectedPage.instagram_business_account?.id ?? null,
            profilePictureUrl: selectedPage.picture?.data?.url ?? null,
            accountType: 'Page',
            category: selectedPage.category ?? null,
            profileLastFetchedAt: nowIso,
            ...(pending.facebook_user_id ? { facebookUserId: pending.facebook_user_id } : {}),
          },
        },
        { onConflict: 'brand_id,provider' },
      )
      .select('id')
      .single()

    if (fbError) {
      throw new Error(`Failed to store Facebook account: ${fbError.message}`)
    }

    if (fbUpserted?.id) {
      try {
        await updateBrandPostInformationFromSocialAccount(fbUpserted.id)
      } catch (postInfoError) {
        console.error('[finalize-connection:post_info] Facebook:', postInfoError)
      }
    }

    // Save linked Instagram account if available
    if (selectedPage.instagram_business_account?.id) {
      try {
        const instagramAccount = await fetchInstagramAccount(
          selectedPage.instagram_business_account.id,
          selectedPage.access_token,
        )

        targetProviders.push('instagram')

        const { data: igUpserted, error: igError } = await supabaseAdmin
          .from('social_accounts')
          .upsert(
            {
              brand_id: pending.brand_id,
              provider: 'instagram',
              account_id: instagramAccount.id,
              handle: instagramAccount.username || instagramAccount.name || 'Instagram account',
              token_encrypted: encryptToken(selectedPage.access_token),
              refresh_token_encrypted: null,
              token_expires_at: null,
              status: 'connected',
              connected_by_user_id: userData.user.id,
              last_refreshed_at: nowIso,
              metadata: {
                facebookPageId: selectedPage.id,
                instagramBusinessAccountId: instagramAccount.id,
                igUserId: instagramAccount.id,
                profilePictureUrl: instagramAccount.profile_picture_url ?? null,
                accountType: 'Business',
                name: instagramAccount.name ?? null,
                username: instagramAccount.username ?? null,
                biography: instagramAccount.biography ?? null,
                followersCount: instagramAccount.followers_count ?? null,
                followsCount: instagramAccount.follows_count ?? null,
                mediaCount: instagramAccount.media_count ?? null,
                website: instagramAccount.website ?? null,
                profileLastFetchedAt: nowIso,
                ...(pending.facebook_user_id ? { facebookUserId: pending.facebook_user_id } : {}),
              },
            },
            { onConflict: 'brand_id,provider' },
          )
          .select('id')
          .single()

        if (igError) {
          console.error('[finalize-connection] Instagram upsert error:', igError.message)
        }

        if (igUpserted?.id) {
          try {
            await updateBrandPostInformationFromSocialAccount(igUpserted.id)
          } catch (postInfoError) {
            console.error('[finalize-connection:post_info] Instagram:', postInfoError)
          }
        }
      } catch (error) {
        console.warn('[finalize-connection] Failed to load linked Instagram account:', error)
      }
    }

    // Refresh tokens for other brands that share the same Facebook pages
    try {
      await refreshCrossBrandTokens(allPages, pending.brand_id)
    } catch (refreshError) {
      console.error('[finalize-connection:cross_brand_refresh]', refreshError)
    }

    // Delete the pending record
    await supabaseAdmin
      .from('pending_oauth_connections')
      .delete()
      .eq('id', pendingId)

    console.log('[finalize-connection] Complete:', {
      brandId: pending.brand_id,
      providers: targetProviders,
    })

    return NextResponse.json({ connected: targetProviders })
  } catch (error) {
    console.error('[finalize-connection] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to finalize connection.' },
      { status: 500 },
    )
  }
}
