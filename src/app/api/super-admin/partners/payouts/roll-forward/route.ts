import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'

export const runtime = 'nodejs'

const bodySchema = z.object({
  partner_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// Roll forward: records an audit trail row with status = rolled_forward so we
// know the under-$50 balance was intentionally deferred. Commissions remain in
// `pending` with no payout_id linkage, so next month's generate picks them up.
export async function POST(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

  const { partner_id, period_start, period_end } = parsed.data

  // Aggregate pending commissions to record the rolled-over amount on the audit row.
  const startIso = `${period_start}T00:00:00Z`
  const endIso = `${period_end}T23:59:59Z`
  const { data: commissions } = await supabaseAdmin
    .from('partner_commissions')
    .select('commission_cents')
    .eq('partner_id', partner_id)
    .eq('status', 'pending')
    .is('payout_id', null)
    .gte('invoice_paid_at', startIso)
    .lte('invoice_paid_at', endIso)

  const subtotal = (commissions ?? []).reduce((s, c) => s + c.commission_cents, 0)

  // Short audit BCTI number - prefix with ROLL to distinguish from issued invoices.
  const stamp = period_end.replace(/-/g, '')
  const bctiNumber = `ROLL-${stamp}-${partner_id.slice(0, 8)}`

  const { error } = await supabaseAdmin.from('partner_payouts').insert({
    partner_id,
    period_start,
    period_end,
    commission_subtotal_cents: subtotal,
    gst_cents: 0,
    total_cents: subtotal,
    bcti_number: bctiNumber,
    status: 'rolled_forward',
    notes: `Rolled forward: under $50 threshold for period ${period_start} to ${period_end}`,
  })

  if (error) {
    console.error('[payouts/roll-forward]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
