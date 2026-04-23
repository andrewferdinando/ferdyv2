import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'

export const runtime = 'nodejs'

interface Ctx {
  params: Promise<{ id: string }>
}

const bodySchema = z.object({
  paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payment_reference: z.string().trim().max(200).optional().or(z.literal('')),
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

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 },
    )
  }

  const { data: payout, error } = await supabaseAdmin
    .from('partner_payouts')
    .select('id, status')
    .eq('id', id)
    .single()

  if (error || !payout) {
    return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
  }

  // Enforce status progression: must have been sent before paid.
  if (payout.status !== 'sent') {
    return NextResponse.json(
      { error: `Cannot mark paid from status "${payout.status}". Send the BCTI first.` },
      { status: 400 },
    )
  }

  const paidAtIso = new Date(`${parsed.data.paid_at}T00:00:00Z`).toISOString()

  // 1. Flip the payout.
  const { error: updErr } = await supabaseAdmin
    .from('partner_payouts')
    .update({
      status: 'paid',
      paid_at: paidAtIso,
      payment_reference: parsed.data.payment_reference?.trim() || null,
    })
    .eq('id', id)

  if (updErr) {
    console.error('[payouts/mark-paid] update payout', updErr)
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  // 2. Flip all linked commissions to paid_out.
  const { error: commErr } = await supabaseAdmin
    .from('partner_commissions')
    .update({ status: 'paid_out' })
    .eq('payout_id', id)
    .eq('status', 'pending')

  if (commErr) {
    console.error('[payouts/mark-paid] commissions', commErr)
    return NextResponse.json({ error: commErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
