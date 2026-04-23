import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'

export const runtime = 'nodejs'

interface Ctx {
  params: Promise<{ id: string }>
}

const convertSchema = z.object({
  group_id: z.string().uuid(),
})

export async function POST(request: NextRequest, ctx: Ctx) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = convertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 },
    )
  }

  const { group_id } = parsed.data

  // Ensure the group exists and is not already attributed.
  const { data: group, error: groupErr } = await supabaseAdmin
    .from('groups')
    .select('id, partner_enquiry_id')
    .eq('id', group_id)
    .single()

  if (groupErr || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 })
  }

  if (group.partner_enquiry_id && group.partner_enquiry_id !== id) {
    return NextResponse.json(
      { error: 'This group is already attributed to another partner enquiry.' },
      { status: 409 },
    )
  }

  // Ensure no other converted enquiry is already on this group.
  const { data: existingConverted } = await supabaseAdmin
    .from('partner_enquiries')
    .select('id')
    .eq('group_id', group_id)
    .eq('status', 'converted')
    .neq('id', id)
    .maybeSingle()

  if (existingConverted) {
    return NextResponse.json(
      { error: 'Another enquiry has already been converted for this group.' },
      { status: 409 },
    )
  }

  const now = new Date().toISOString()

  // 1. Update the enquiry.
  const { error: enqErr } = await supabaseAdmin
    .from('partner_enquiries')
    .update({
      status: 'converted',
      group_id,
      converted_at: now,
    })
    .eq('id', id)

  if (enqErr) {
    console.error('[enquiries/convert] enquiry update failed', enqErr)
    return NextResponse.json({ error: enqErr.message }, { status: 500 })
  }

  // 2. Point the group back at the enquiry.
  const { error: groupUpdateErr } = await supabaseAdmin
    .from('groups')
    .update({ partner_enquiry_id: id })
    .eq('id', group_id)

  if (groupUpdateErr) {
    // Best-effort rollback.
    await supabaseAdmin
      .from('partner_enquiries')
      .update({ status: 'in_progress', group_id: null, converted_at: null })
      .eq('id', id)
    console.error('[enquiries/convert] group update failed', groupUpdateErr)
    return NextResponse.json({ error: groupUpdateErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
