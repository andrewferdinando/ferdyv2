'use server'

import { supabaseAdmin } from '@/lib/supabase-server'

export type InviteStatus = 'pending' | 'pending_existing' | 'accepted'

interface UpsertInviteParams {
  brandId: string
  email: string
  name: string
  role: 'admin' | 'editor'
  status: InviteStatus
}

export async function upsertBrandInvite({
  brandId,
  email,
  name,
  role,
  status,
}: UpsertInviteParams) {
  await supabaseAdmin.from('brand_invites').upsert(
    {
      brand_id: brandId,
      email: email.toLowerCase(),
      invitee_name: name,
      role,
      status,
    },
    {
      onConflict: 'brand_id,email',
    },
  )
}

export async function findPendingInvite(email: string, brandId?: string) {
  let query = supabaseAdmin
    .from('brand_invites')
    .select('brand_id, invitee_name, role, status')
    .eq('email', email.toLowerCase())
    .in('status', ['pending', 'pending_existing'] satisfies InviteStatus[])
    .order('created_at', { ascending: false })

  if (brandId) {
    query = query.eq('brand_id', brandId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error('findPendingInvite error', error)
    return null
  }

  return data
}

export async function findPendingInvitesByEmail(email: string) {
  const { data, error } = await supabaseAdmin
    .from('brand_invites')
    .select('brand_id, invitee_name, role, status')
    .eq('email', email.toLowerCase())
    .in('status', ['pending', 'pending_existing'] satisfies InviteStatus[])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('findPendingInvitesByEmail error', error)
    return []
  }

  return data ?? []
}

export async function markInviteAccepted(email: string, brandId: string) {
  await supabaseAdmin
    .from('brand_invites')
    .update({ status: 'accepted' satisfies InviteStatus })
    .eq('brand_id', brandId)
    .eq('email', email.toLowerCase())
}


