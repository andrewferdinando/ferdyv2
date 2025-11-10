'use server'

import { supabaseAdmin } from '@/lib/supabase-server'
import {
  findPendingInvite,
  findPendingInvitesByEmail,
  markInviteAccepted,
} from '@/lib/server/brandInvites'

interface FinalizeInvitePayload {
  accessToken: string
  brandId?: string | null
}

export async function finalizeInvite({
  accessToken,
  brandId,
}: FinalizeInvitePayload) {
  if (!accessToken) {
    throw new Error('Missing access token')
  }

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(accessToken)

  if (userError || !userData?.user) {
    console.error('finalizeInvite getUser error', userError)
    throw new Error('Unable to validate session')
  }

  const user = userData.user
  const userEmail = user.email?.toLowerCase()

  if (!userEmail) {
    throw new Error('Email missing from user profile')
  }

  let resolvedBrandId = brandId ?? null
  let resolvedRole: 'admin' | 'editor' = 'editor'

  let selectedInvite:
    | (Awaited<ReturnType<typeof findPendingInvite>> & { invitee_name?: string })
    | (Awaited<ReturnType<typeof findPendingInvitesByEmail>>[number] & {
        invitee_name?: string
      })
    | null = null
  let inviteeName: string | null = null

  const metadataBrandId =
    user.user_metadata?.brand_id ??
    user.user_metadata?.brandId ??
    user.user_metadata?.brandID ??
    null
  const metadataRole =
    (user.user_metadata?.role as 'admin' | 'editor' | undefined) ??
    (user.user_metadata?.brand_role as 'admin' | 'editor' | undefined) ??
    null
  const metadataName =
    user.user_metadata?.invitee_name ??
    user.user_metadata?.name ??
    user.user_metadata?.full_name ??
    null

  if (!resolvedBrandId) {
    const invites = await findPendingInvitesByEmail(userEmail)
    if (invites.length > 0) {
      resolvedBrandId = invites[0].brand_id
      resolvedRole = (invites[0].role as 'admin' | 'editor') ?? 'editor'
      selectedInvite = invites[0]
    }
  } else {
    const invite = await findPendingInvite(userEmail, resolvedBrandId)
    if (invite?.role) {
      resolvedRole = invite.role as 'admin' | 'editor'
      selectedInvite = invite
    }
  }

  if (!resolvedBrandId && metadataBrandId) {
    resolvedBrandId = metadataBrandId
  }

  if (metadataRole === 'admin' || metadataRole === 'editor') {
    resolvedRole = metadataRole
  }

  if (!resolvedBrandId) {
    throw new Error('Invite not found for this user')
  }

  const { error: membershipError } = await supabaseAdmin
    .from('brand_memberships')
    .upsert(
      {
        brand_id: resolvedBrandId,
        user_id: user.id,
        role: resolvedRole,
      },
      {
        onConflict: 'brand_id,user_id',
      },
    )

  if (membershipError) {
    console.error('finalizeInvite membership upsert error', membershipError)
    throw new Error('Unable to create membership for invite')
  }

  await markInviteAccepted(userEmail, resolvedBrandId)

  inviteeName = selectedInvite?.invitee_name ?? metadataName ?? null

  const profileUpdate: { user_id: string; role: string; full_name?: string } = {
    user_id: user.id,
    role: resolvedRole,
  }

  if (inviteeName) {
    profileUpdate.full_name = inviteeName
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(profileUpdate, { onConflict: 'user_id' })

  if (profileError) {
    console.error('finalizeInvite profile upsert error', profileError)
  }

  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('name')
    .eq('id', resolvedBrandId)
    .maybeSingle()

  return {
    brandId: resolvedBrandId,
    brandName: brand?.name ?? 'the brand',
    role: resolvedRole,
    inviteName: inviteeName ?? null,
  }
}


