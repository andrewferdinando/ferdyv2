'use server'

import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  findPendingInvite,
  findPendingInvitesByEmail,
  markInviteAccepted,
} from '@/lib/server/brandInvites'

const APP_URL = process.env.APP_URL!

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

  if (!resolvedBrandId) {
    const invites = await findPendingInvitesByEmail(userEmail)
    if (invites.length > 0) {
      resolvedBrandId = invites[0].brand_id
      resolvedRole = (invites[0].role as 'admin' | 'editor') ?? 'editor'
    }
  } else {
    const invite = await findPendingInvite(userEmail, resolvedBrandId)
    if (invite?.role) {
      resolvedRole = invite.role as 'admin' | 'editor'
    }
  }

  if (!resolvedBrandId) {
    throw new Error('Invite not found for this user')
  }

  await supabaseAdmin.from('brand_memberships').upsert(
    {
      brand_id: resolvedBrandId,
      user_id: user.id,
      role: resolvedRole,
    },
    {
      onConflict: 'brand_id,user_id',
    },
  )

  await markInviteAccepted(userEmail, resolvedBrandId)

  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('name')
    .eq('id', resolvedBrandId)
    .maybeSingle()

  return {
    brandId: resolvedBrandId,
    brandName: brand?.name ?? 'the brand',
    role: resolvedRole,
  }
}


