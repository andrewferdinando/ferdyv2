import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'
import { sendPartnerBCTI } from '@/lib/emails/partnerEmails'

export const runtime = 'nodejs'

interface Ctx {
  params: Promise<{ id: string }>
}

function monthYearLabel(periodStart: string): string {
  const d = new Date(periodStart)
  return d.toLocaleString('en-NZ', { month: 'long', year: 'numeric' })
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params

  const { data: payout, error } = await supabaseAdmin
    .from('partner_payouts')
    .select('id, partner_id, bcti_number, pdf_storage_path, period_start, period_end, total_cents, gst_cents, status, partners(full_name, email)')
    .eq('id', id)
    .single()

  if (error || !payout) {
    return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
  }

  if (payout.status !== 'issued' && payout.status !== 'sent' && payout.status !== 'paid') {
    return NextResponse.json(
      { error: `Cannot send BCTI in status "${payout.status}".` },
      { status: 400 },
    )
  }

  if (!payout.pdf_storage_path) {
    return NextResponse.json({ error: 'PDF not available for this payout.' }, { status: 400 })
  }

  // Fetch the PDF from storage.
  const { data: pdfBlob, error: dlErr } = await supabaseAdmin.storage
    .from('partner-bctis')
    .download(payout.pdf_storage_path)

  if (dlErr || !pdfBlob) {
    console.error('[payouts/send] pdf download', dlErr)
    return NextResponse.json({ error: 'Could not fetch BCTI PDF.' }, { status: 500 })
  }

  const pdfBase64 = Buffer.from(await pdfBlob.arrayBuffer()).toString('base64')

  const partner = payout.partners as unknown as { full_name: string; email: string }
  if (!partner?.email) {
    return NextResponse.json({ error: 'Partner has no email on file.' }, { status: 400 })
  }

  try {
    await sendPartnerBCTI({
      to: partner.email,
      fullName: partner.full_name,
      bctiNumber: payout.bcti_number,
      periodLabel: monthYearLabel(payout.period_start),
      totalCents: payout.total_cents,
      gstCents: payout.gst_cents,
      currency: 'nzd',
      pdfBase64,
      pdfFilename: `${payout.bcti_number}.pdf`,
    })
  } catch (err) {
    console.error('[payouts/send] email failed', err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  const now = new Date().toISOString()
  const nextStatus = payout.status === 'paid' ? 'paid' : 'sent'
  const { error: updErr } = await supabaseAdmin
    .from('partner_payouts')
    .update({ sent_at: now, sent_to_email: partner.email, status: nextStatus })
    .eq('id', id)

  if (updErr) {
    console.error('[payouts/send] update', updErr)
    return NextResponse.json({ error: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
