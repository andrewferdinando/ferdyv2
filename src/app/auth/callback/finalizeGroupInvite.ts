'use server'

import { supabaseAdmin } from '@/lib/supabase-server'

interface BrandAssignment {
  brandId: string
  role: 'admin' | 'editor'
}

interface FinalizeGroupInvitePayload {
  accessToken: string
}

export async function finalizeGroupInvite({
  accessToken,
}: FinalizeGroupInvitePayload) {
  if (!accessToken) {
    throw new Error('Missing access token')
  }

  console.log('[finalizeGroupInvite] Starting...')

  const { data: userData, error: userError } =
    await supabaseAdmin.auth.getUser(accessToken)

  if (userError || !userData?.user) {
    console.error('[finalizeGroupInvite] getUser error', userError)
    throw new Error('Unable to validate session')
  }

  const user = userData.user
  const userEmail = user.email?.toLowerCase()

  if (!userEmail) {
    throw new Error('Email missing from user profile')
  }

  console.log('[finalizeGroupInvite] User metadata:', JSON.stringify(user.user_metadata, null, 2))
  console.log('[finalizeGroupInvite] App metadata:', JSON.stringify(user.app_metadata, null, 2))

  // Get group and brand data from user metadata
  const groupId = user.user_metadata?.group_id
  const groupRole = user.user_metadata?.group_role || 'member'
  const brandAssignments = user.user_metadata?.brand_assignments as BrandAssignment[] | undefined

  console.log('[finalizeGroupInvite] Extracted values:', { groupId, groupRole, brandAssignments })

  if (!groupId) {
    console.error('[finalizeGroupInvite] No group_id found in metadata')
    console.error('[finalizeGroupInvite] Full user object:', JSON.stringify(user, null, 2))
    throw new Error('Group invite data not found. Please request a new invitation.')
  }

  // Add user to group
  const { error: groupError } = await supabaseAdmin
    .from('group_memberships')
    .upsert(
      {
        group_id: groupId,
        user_id: user.id,
        role: groupRole,
      },
      {
        onConflict: 'group_id,user_id',
      },
    )

  if (groupError) {
    console.error('[finalizeGroupInvite] group membership error', groupError)
    throw new Error('Unable to add you to the team')
  }

  console.log('[finalizeGroupInvite] Added to group:', groupId)

  // Add brand assignments
  let firstBrandId: string | null = null
  let firstBrandName = 'your brands'

  if (brandAssignments && brandAssignments.length > 0) {
    const brandMemberships = brandAssignments.map(assignment => ({
      brand_id: assignment.brandId,
      user_id: user.id,
      role: assignment.role,
    }))

    const { error: brandError } = await supabaseAdmin
      .from('brand_memberships')
      .upsert(brandMemberships, {
        onConflict: 'brand_id,user_id',
      })

    if (brandError) {
      console.error('[finalizeGroupInvite] brand memberships error', brandError)
      // Don't fail - they're in the group at least
    } else {
      console.log('[finalizeGroupInvite] Added to brands:', brandAssignments.length)
    }

    // Get first brand for redirect
    firstBrandId = brandAssignments[0].brandId
    const { data: brand } = await supabaseAdmin
      .from('brands')
      .select('name')
      .eq('id', firstBrandId)
      .maybeSingle()

    if (brand) {
      firstBrandName = brand.name
    }
  }

  // Update profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        user_id: user.id,
        role: groupRole,
      },
      { onConflict: 'user_id' }
    )

  if (profileError) {
    console.error('[finalizeGroupInvite] profile upsert error', profileError)
  }

  // If no brands assigned, redirect to brands list
  if (!firstBrandId) {
    return {
      brandId: null,
      brandName: 'Ferdy',
      role: groupRole,
    }
  }

  return {
    brandId: firstBrandId,
    brandName: firstBrandName,
    role: brandAssignments?.[0]?.role || 'editor',
  }
}
