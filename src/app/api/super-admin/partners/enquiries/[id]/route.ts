import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'

export const runtime = 'nodejs'

interface Ctx {
  params: Promise<{ id: string }>
}

const updateSchema = z.object({
  status: z.enum(['new', 'in_progress', 'converted', 'expired', 'lost']).optional(),
  prospect_company: z.string().trim().min(1).max(200).optional(),
  prospect_contact_name: z.string().trim().min(1).max(200).optional(),
  prospect_email: z.string().trim().toLowerCase().email().max(320).nullable().optional().or(z.literal('')),
  enquiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
})

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 },
    )
  }

  const update: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue
    if (typeof v === 'string' && v === '' && k !== 'status') {
      update[k] = null
    } else {
      update[k] = v
    }
  }

  // Explicitly block setting status=converted via this endpoint — use /convert instead.
  if (update.status === 'converted') {
    return NextResponse.json(
      { error: 'Use the convert endpoint to mark an enquiry as converted.' },
      { status: 400 },
    )
  }

  // If transitioning away from converted, clear the link to the group.
  if (update.status && update.status !== 'converted') {
    const { data: current } = await supabaseAdmin
      .from('partner_enquiries')
      .select('status, group_id')
      .eq('id', id)
      .single()
    if (current?.status === 'converted' && current.group_id) {
      await supabaseAdmin
        .from('groups')
        .update({ partner_enquiry_id: null })
        .eq('id', current.group_id)
      update.group_id = null
      update.converted_at = null
    }
  }

  const { error } = await supabaseAdmin
    .from('partner_enquiries')
    .update(update)
    .eq('id', id)

  if (error) {
    console.error('[super-admin/partners/enquiries/[id] PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params

  // Block delete if there are commissions attached — would orphan the audit trail.
  const { count } = await supabaseAdmin
    .from('partner_commissions')
    .select('id', { count: 'exact', head: true })
    .eq('enquiry_id', id)

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Cannot delete: this enquiry has commission records.' },
      { status: 409 },
    )
  }

  const { error } = await supabaseAdmin
    .from('partner_enquiries')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[super-admin/partners/enquiries/[id] DELETE]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
