'use server'

import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { requireAdminForBrand } from '@/lib/server/auth'
import { upsertBrandInvite } from '@/lib/server/brandInvites'

const APP_URL = process.env.APP_URL!

const InviteSchema = z.object({
  brandId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'editor']),
  inviterId: z.string().uuid(),
})

export async function sendTeamInvite(input: z.infer<typeof InviteSchema>) {
  const payload = InviteSchema.parse(input)
  const { brandId, email, role, inviterId } = payload

  await requireAdminForBrand(brandId, inviterId)

  const { data: list } = await supabaseAdmin.auth.admin.listUsers()
  const existing = list?.users?.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  )

  if (!existing) {
    await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        brand_id: brandId,
        role,
        src: 'team_invite',
      },
      redirectTo: `${APP_URL}/auth/callback?src=invite`,
    })

    await upsertBrandInvite({
      brandId,
      email: email.toLowerCase(),
      role,
      status: 'pending',
    })
  } else {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${APP_URL}/auth/callback?src=invite&brand_id=${brandId}`,
      },
    })

    if (error || !data?.properties?.action_link) {
      console.error('generateLink failed', error)
      throw new Error('Failed to generate magic link')
    }

    // Supabase handles sending the magic link email when using signInWithOtp.
    const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: data.properties.action_link,
      },
    })

    if (otpError) {
      console.error('Error sending magic link', otpError)
      throw new Error('Failed to send invite email')
    }

    await upsertBrandInvite({
      brandId,
      email: email.toLowerCase(),
      role,
      status: 'pending_existing',
    })
  }

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
    .select('email, role, status, created_at')
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


