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

  // Try to get invitation from database first
  const { data: invitation, error: inviteError } = await supabaseAdmin
    .from('pending_team_invitations')
    .select('*')
    .eq('email', userEmail)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  console.log('[finalizeGroupInvite] Database invitation:', invitation)
  console.log('[finalizeGroupInvite] User metadata:', user.user_metadata)

  // Get group and brand data from database or fallback to metadata
  let groupId: string | null = null
  let groupRole = 'member'
  let brandAssignments: BrandAssignment[] | undefined
  let inviteeName: string | null = null

  if (invitation) {
    groupId = invitation.group_id
    groupRole = invitation.group_role || 'member'
    brandAssignments = invitation.brand_assignments as BrandAssignment[] | undefined
    inviteeName = invitation.invitee_name
    console.log('[finalizeGroupInvite] Using database invitation')
  } else {
    // Fallback to metadata
    groupId = user.user_metadata?.group_id
    groupRole = user.user_metadata?.group_role || 'member'
    brandAssignments = user.user_metadata?.brand_assignments as BrandAssignment[] | undefined
    inviteeName = user.user_metadata?.invitee_name
    console.log('[finalizeGroupInvite] Using metadata fallback')
  }

  console.log('[finalizeGroupInvite] Final values:', { groupId, groupRole, brandAssignments })

  if (!groupId) {
    console.error('[finalizeGroupInvite] No group_id found')
    const debugInfo = {
      hasInvitation: !!invitation,
      inviteError: inviteError?.message,
      hasMetadata: !!user.user_metadata,
      metadataKeys: user.user_metadata ? Object.keys(user.user_metadata) : [],
    }
    throw new Error(`Group invite data not found. Debug: ${JSON.stringify(debugInfo)}`)
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

  // Create/update user profile with name
  const { error: userProfileError } = await supabaseAdmin
    .from('user_profiles')
    .upsert(
      {
        id: user.id,
        name: inviteeName || userEmail.split('@')[0],
        email: userEmail,
      },
      { onConflict: 'id' }
    )

  if (userProfileError) {
    console.error('[finalizeGroupInvite] user profile error', userProfileError)
    // Don't fail - continue with profile creation
  }

  // Update profile
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        user_id: user.id,
        role: groupRole,
        full_name: inviteeName || userEmail.split('@')[0],
      },
      { onConflict: 'user_id' }
    )

  if (profileError) {
    console.error('[finalizeGroupInvite] profile upsert error', profileError)
  }

  // Mark invitation as accepted if it came from database
  if (invitation) {
    await supabaseAdmin
      .from('pending_team_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)
    
    console.log('[finalizeGroupInvite] Marked invitation as accepted')
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
