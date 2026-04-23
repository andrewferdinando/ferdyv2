import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'

export const runtime = 'nodejs'

// Returns per-partner pending commission aggregates for the given period.
// Default period = previous calendar month (UTC).
//
// Also returns existing draft/issued/sent/paid payouts overlapping the period
// so the UI can show the current status.
export async function GET(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const params = request.nextUrl.searchParams
  const fromParam = params.get('from')
  const toParam = params.get('to')

  const now = new Date()
  const defaultStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const defaultEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0))

  const periodStart = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? fromParam : defaultStart.toISOString().slice(0, 10)
  const periodEnd = toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam) ? toParam : defaultEnd.toISOString().slice(0, 10)

  // Fetch all pending commissions that fall inside the period (by invoice_paid_at date).
  const startIso = `${periodStart}T00:00:00Z`
  const endIso = `${periodEnd}T23:59:59Z`

  const { data: commissions, error: commErr } = await supabaseAdmin
    .from('partner_commissions')
    .select('id, partner_id, commission_cents, status, invoice_paid_at')
    .eq('status', 'pending')
    .gte('invoice_paid_at', startIso)
    .lte('invoice_paid_at', endIso)

  if (commErr) {
    console.error('[pending-payouts GET]', commErr)
    return NextResponse.json({ error: commErr.message }, { status: 500 })
  }

  // Aggregate by partner.
  const byPartner = new Map<string, { subtotal_cents: number; commission_count: number }>()
  for (const c of commissions ?? []) {
    const entry = byPartner.get(c.partner_id) ?? { subtotal_cents: 0, commission_count: 0 }
    entry.subtotal_cents += c.commission_cents
    entry.commission_count += 1
    byPartner.set(c.partner_id, entry)
  }

  const partnerIds = [...byPartner.keys()]
  if (partnerIds.length === 0) {
    return NextResponse.json({ period: { start: periodStart, end: periodEnd }, rows: [] })
  }

  const { data: partners, error: partErr } = await supabaseAdmin
    .from('partners')
    .select('id, full_name, trading_name, email, gst_registered, country, status')
    .in('id', partnerIds)

  if (partErr) {
    console.error('[pending-payouts GET] partners', partErr)
    return NextResponse.json({ error: partErr.message }, { status: 500 })
  }

  // Look up any existing payout already covering this period (per partner).
  const { data: existingPayouts } = await supabaseAdmin
    .from('partner_payouts')
    .select('id, partner_id, status, bcti_number, total_cents, gst_cents, commission_subtotal_cents, period_start, period_end, issued_at, sent_at, paid_at, pdf_storage_path')
    .in('partner_id', partnerIds)
    .eq('period_start', periodStart)
    .eq('period_end', periodEnd)

  const payoutByPartner = new Map<string, Record<string, unknown>>()
  for (const p of existingPayouts ?? []) {
    payoutByPartner.set(p.partner_id, p as Record<string, unknown>)
  }

  const rows = (partners ?? []).map((p) => {
    const agg = byPartner.get(p.id) ?? { subtotal_cents: 0, commission_count: 0 }
    const subtotal = agg.subtotal_cents
    const gst = p.gst_registered ? Math.round(subtotal * 0.15) : 0
    const total = subtotal + gst
    const meetsThreshold = subtotal >= 5000
    const existing = payoutByPartner.get(p.id) ?? null
    return {
      partner_id: p.id,
      full_name: p.full_name,
      trading_name: p.trading_name,
      email: p.email,
      gst_registered: p.gst_registered,
      country: p.country,
      partner_status: p.status,
      commission_count: agg.commission_count,
      subtotal_cents: subtotal,
      gst_cents: gst,
      total_cents: total,
      meets_threshold: meetsThreshold,
      payout: existing,
    }
  })

  return NextResponse.json({
    period: { start: periodStart, end: periodEnd },
    rows,
  })
}
