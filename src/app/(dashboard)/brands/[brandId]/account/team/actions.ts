'use server'

import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAdminForBrand } from '@/lib/server/auth'
import { upsertBrandInvite } from '@/lib/server/brandInvites'

const APP_URL = process.env.APP_URL!

const InviteSchema = z.object({
  brandId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['admin', 'editor']),
  inviterId: z.string().uuid(),
})

const UpdateRoleSchema = z.object({
  brandId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(['admin', 'editor']),
  requesterId: z.string().uuid(),
})

const RemoveMemberSchema = z.object({
  brandId: z.string().uuid(),
  memberId: z.string().uuid(),
  requesterId: z.string().uuid(),
})

export async function sendTeamInvite(input: z.infer<typeof InviteSchema>) {
  const payload = InviteSchema.parse(input)
  const { brandId, email, name, role, inviterId } = payload
  const normalizedEmail = email.trim().toLowerCase()

  await requireAdminForBrand(brandId, inviterId)

  const { data: list } = await supabaseAdmin.auth.admin.listUsers()
  const existing = list?.users?.find(
    (user) => user.email?.toLowerCase() === normalizedEmail,
  )

  if (!existing) {
    await supabaseAdmin.auth.admin.inviteUserByEmail(normalizedEmail, {
      data: {
        brand_id: brandId,
        invitee_name: name,
        role,
        src: 'team_invite',
      },
      redirectTo: `${APP_URL}/auth/set-password?src=invite&brand_id=${brandId}`,
    })

  } else {
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${APP_URL}/auth/existing-invite?src=invite&brand_id=${brandId}&email=${encodeURIComponent(
          normalizedEmail,
        )}`,
      },
    })

    if (otpError) {
      console.error('Error sending magic link', otpError)
      throw new Error('Failed to send invite email')
    }

    const updatedMetadata = {
      ...(existing.user_metadata || {}),
      brand_id: brandId,
      brand_role: role,
      invitee_name: name,
      last_invite_sent_at: new Date().toISOString(),
    }

    const { error: updateUserError } =
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        user_metadata: updatedMetadata,
      })

    if (updateUserError) {
      console.error('sendTeamInvite updateUser metadata error', updateUserError)
    }

    await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id: existing.id,
          full_name: name,
          role,
        },
        { onConflict: 'user_id' },
      )

  }

  await upsertBrandInvite({
    brandId,
    email: normalizedEmail,
    name,
    role,
    status: existing ? 'pending_existing' : 'pending',
  })

  console.log('team invite recorded', {
    brandId,
    email: normalizedEmail,
    role,
    status: existing ? 'pending_existing' : 'pending',
  })

  return { ok: true }
}

export async function fetchTeamState(brandId: string) {
  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from('brand_memberships')
    .select('user_id, role, created_at')
    .eq('brand_id', brandId)
    .order('created_at', { ascending: false })

  if (membershipsError) {
    console.error('fetchTeamState memberships error', membershipsError)
    throw new Error('Unable to load team members')
  }

  const userIds = (memberships ?? []).map((member) => member.user_id)

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, full_name')
    .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000'])

  if (profilesError) {
    console.error('fetchTeamState profiles error', profilesError)
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile.full_name ?? 'Unknown']),
  )

  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('name')
    .eq('id', brandId)
    .maybeSingle()

  const { data: authUsers, error: listError } =
    await supabaseAdmin.auth.admin.listUsers()

  if (listError) {
    console.error('fetchTeamState listUsers error', listError)
    throw new Error('Unable to load team members')
  }

  const emailMap = new Map(
    (authUsers.users || []).map((user) => [user.id, user.email ?? '']),
  )

  const members = (memberships || []).map((member) => ({
    id: member.user_id,
    email: emailMap.get(member.user_id) || '',
    role: member.role,
    created_at: member.created_at,
    name: profileMap.get(member.user_id) ?? 'Unknown',
    brand_name: brand?.name ?? '',
  }))

  const { data: invites, error: invitesError } = await supabaseAdmin
    .from('brand_invites')
    .select('email, invitee_name, role, status, created_at')
    .eq('brand_id', brandId)
    .in('status', ['pending', 'pending_existing'])
    .order('created_at', { ascending: false })

  if (invitesError) {
    console.error('fetchTeamState invites error', invitesError)
  }

  return {
    members,
    invites: invites ?? [],
    brandName: brand?.name ?? '',
  }
}

export async function updateTeamMemberRole(input: z.infer<typeof UpdateRoleSchema>) {
  const payload = UpdateRoleSchema.parse(input)
  const { brandId, memberId, role, requesterId } = payload

  if (memberId === requesterId) {
    throw new Error('You cannot change your own role.')
  }

  await requireAdminForBrand(brandId, requesterId)

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('brand_memberships')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', memberId)
    .maybeSingle()

  if (membershipError) {
    console.error('updateTeamMemberRole membership lookup error', membershipError)
    throw new Error('Unable to fetch team member.')
  }

  if (!membership) {
    throw new Error('Team member not found.')
  }

  if (membership.role === 'super_admin') {
    throw new Error('Super admins cannot be edited.')
  }

  if (membership.role === role) {
    return { ok: true }
  }

  if (membership.role === 'admin' && role !== 'admin') {
    const { count: otherAdminsCount, error: adminCountError } = await supabaseAdmin
      .from('brand_memberships')
      .select('*', { head: true, count: 'exact' })
      .eq('brand_id', brandId)
      .in('role', ['admin', 'super_admin'])
      .neq('user_id', memberId)

    if (adminCountError) {
      console.error('updateTeamMemberRole adminCount error', adminCountError)
      throw new Error('Unable to verify admin quota.')
    }

    if (!otherAdminsCount || otherAdminsCount === 0) {
      throw new Error('At least one admin must remain on the team.')
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('brand_memberships')
    .update({ role })
    .eq('brand_id', brandId)
    .eq('user_id', memberId)

  if (updateError) {
    console.error('updateTeamMemberRole update error', updateError)
    throw new Error('Unable to update the role. Please try again.')
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', memberId)
    .maybeSingle()

  if (!profile || profile.role !== 'super_admin') {
    await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          user_id: memberId,
          role,
        },
        { onConflict: 'user_id' },
      )
  }

  return { ok: true }
}

export async function removeTeamMember(input: z.infer<typeof RemoveMemberSchema>) {
  const payload = RemoveMemberSchema.parse(input)
  const { brandId, memberId, requesterId } = payload

  if (memberId === requesterId) {
    throw new Error('You cannot remove yourself from the team.')
  }

  await requireAdminForBrand(brandId, requesterId)

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from('brand_memberships')
    .select('role')
    .eq('brand_id', brandId)
    .eq('user_id', memberId)
    .maybeSingle()

  if (membershipError) {
    console.error('removeTeamMember membership lookup error', membershipError)
    throw new Error('Unable to find team member.')
  }

  if (!membership) {
    throw new Error('Team member not found.')
  }

  if (membership.role === 'super_admin') {
    throw new Error('Super admins cannot be removed from brands.')
  }

  if (membership.role === 'admin') {
    const { count: otherAdminsCount, error: adminCountError } = await supabaseAdmin
      .from('brand_memberships')
      .select('*', { head: true, count: 'exact' })
      .eq('brand_id', brandId)
      .in('role', ['admin', 'super_admin'])
      .neq('user_id', memberId)

    if (adminCountError) {
      console.error('removeTeamMember adminCount error', adminCountError)
      throw new Error('Unable to verify admin quota.')
    }

    if (!otherAdminsCount || otherAdminsCount === 0) {
      throw new Error('At least one admin must remain on the team.')
    }
  }

  const { error: deleteError } = await supabaseAdmin
    .from('brand_memberships')
    .delete()
    .eq('brand_id', brandId)
    .eq('user_id', memberId)

  if (deleteError) {
    console.error('removeTeamMember delete error', deleteError)
    throw new Error('Unable to remove this member. Please try again.')
  }

  return { ok: true }
}


