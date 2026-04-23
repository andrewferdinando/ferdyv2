import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'
import { generateBctiPdf, type BctiLineItem } from '@/server/partners/bctiPdf'

export const runtime = 'nodejs'

const MIN_PAYOUT_CENTS = 5000 // NZD $50 threshold per the brief

const bodySchema = z.object({
  partner_id: z.string().uuid(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

function pad(n: number, width = 4): string {
  return n.toString().padStart(width, '0')
}

function monthLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-NZ', { month: 'short', year: 'numeric' })
}

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
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid' }, { status: 400 })
  }

  const { partner_id, period_start, period_end } = parsed.data

  // Fetch partner.
  const { data: partner, error: partnerErr } = await supabaseAdmin
    .from('partners')
    .select('id, full_name, trading_name, business_address, gst_registered, gst_number')
    .eq('id', partner_id)
    .single()

  if (partnerErr || !partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  }

  // Check for existing payout in this exact period (avoid dupes).
  const { data: existing } = await supabaseAdmin
    .from('partner_payouts')
    .select('id, status')
    .eq('partner_id', partner_id)
    .eq('period_start', period_start)
    .eq('period_end', period_end)
    .maybeSingle()

  if (existing && existing.status !== 'draft' && existing.status !== 'rolled_forward') {
    return NextResponse.json(
      { error: 'A BCTI has already been generated for this period.' },
      { status: 409 },
    )
  }

  // Fetch eligible pending commissions.
  const startIso = `${period_start}T00:00:00Z`
  const endIso = `${period_end}T23:59:59Z`
  const { data: commissions, error: commErr } = await supabaseAdmin
    .from('partner_commissions')
    .select('id, commission_cents, currency, invoice_paid_at, group_id, groups(name), stripe_invoice_id')
    .eq('partner_id', partner_id)
    .eq('status', 'pending')
    .is('payout_id', null)
    .gte('invoice_paid_at', startIso)
    .lte('invoice_paid_at', endIso)

  if (commErr) {
    console.error('[payouts/generate] commissions query', commErr)
    return NextResponse.json({ error: commErr.message }, { status: 500 })
  }

  if (!commissions || commissions.length === 0) {
    return NextResponse.json({ error: 'No pending commissions in this period.' }, { status: 400 })
  }

  const subtotalCents = commissions.reduce((s, c) => s + c.commission_cents, 0)
  if (subtotalCents < MIN_PAYOUT_CENTS) {
    return NextResponse.json(
      { error: `Subtotal (${subtotalCents}c) is under the $50 threshold. Use "Roll forward" instead.` },
      { status: 400 },
    )
  }

  const gstCents = partner.gst_registered ? Math.round(subtotalCents * 0.15) : 0
  const totalCents = subtotalCents + gstCents
  const currency = commissions[0]!.currency || 'nzd'

  // Allocate BCTI number via sequence (RPC wraps nextval()).
  let nextSeq: number
  const { data: seqRow, error: seqErr } = await supabaseAdmin.rpc('next_bcti_number')
  if (seqErr || seqRow == null) {
    console.warn('[payouts/generate] next_bcti_number rpc failed, falling back to count', seqErr)
    const { count } = await supabaseAdmin
      .from('partner_payouts')
      .select('id', { count: 'exact', head: true })
    nextSeq = (count ?? 0) + 1
  } else {
    nextSeq = Number(seqRow)
  }
  const bctiNumber = `BCTI-${pad(nextSeq)}`

  const issueDate = new Date().toISOString().slice(0, 10)

  // Generate PDF.
  const lineItems: BctiLineItem[] = commissions.map((c) => ({
    month: monthLabel(c.invoice_paid_at),
    customerReference: `${(c.groups as any)?.name ?? 'Customer'} · ${c.stripe_invoice_id}`,
    amountCents: c.commission_cents,
  }))

  let pdfBytes: Uint8Array
  try {
    pdfBytes = await generateBctiPdf({
      bctiNumber,
      issueDate,
      periodStart: period_start,
      periodEnd: period_end,
      currency,
      ferdy: {
        legalName: process.env.FERDY_LEGAL_NAME || 'Ferdy AI Limited',
        address:
          process.env.FERDY_LEGAL_ADDRESS ||
          'Auckland, New Zealand\nandrew@ferdy.io',
        gstNumber: process.env.FERDY_GST_NUMBER || null,
      },
      partner: {
        fullName: partner.full_name,
        tradingName: partner.trading_name,
        address: partner.business_address,
        gstNumber: partner.gst_number,
        gstRegistered: partner.gst_registered,
      },
      lineItems,
      subtotalCents,
      gstCents,
      totalCents,
    })
  } catch (err) {
    console.error('[payouts/generate] pdf', err)
    return NextResponse.json({ error: 'PDF generation failed' }, { status: 500 })
  }

  // Upload to private storage.
  const pdfPath = `${partner_id}/${bctiNumber}.pdf`
  const pdfBuffer = Buffer.from(pdfBytes)
  const { error: uploadErr } = await supabaseAdmin.storage
    .from('partner-bctis')
    .upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true })

  if (uploadErr) {
    console.error('[payouts/generate] upload', uploadErr)
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  // Create/update the payout record.
  const payoutRow = {
    partner_id,
    period_start,
    period_end,
    commission_subtotal_cents: subtotalCents,
    gst_cents: gstCents,
    total_cents: totalCents,
    bcti_number: bctiNumber,
    status: 'issued' as const,
    issued_at: new Date().toISOString(),
    pdf_storage_path: pdfPath,
  }

  let payoutId: string

  if (existing) {
    const { error: updErr } = await supabaseAdmin
      .from('partner_payouts')
      .update(payoutRow)
      .eq('id', existing.id)
    if (updErr) {
      console.error('[payouts/generate] update', updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }
    payoutId = existing.id
  } else {
    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('partner_payouts')
      .insert(payoutRow)
      .select('id')
      .single()
    if (insErr || !inserted) {
      console.error('[payouts/generate] insert', insErr)
      return NextResponse.json({ error: insErr?.message || 'Insert failed' }, { status: 500 })
    }
    payoutId = inserted.id
  }

  // Link commissions to this payout.
  const { error: linkErr } = await supabaseAdmin
    .from('partner_commissions')
    .update({ payout_id: payoutId })
    .in(
      'id',
      commissions.map((c) => c.id),
    )

  if (linkErr) {
    console.error('[payouts/generate] link commissions', linkErr)
    return NextResponse.json({ error: linkErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: payoutId, bcti_number: bctiNumber })
}
