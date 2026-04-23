// Partner commission side-effects for Stripe webhook events.
//
// IMPORTANT: These functions MUST NOT throw in a way that breaks the core
// billing webhook. The caller in src/app/api/stripe/webhook/route.ts wraps
// every call in try/catch and logs errors — do not rely on external retry
// behaviour. Idempotency is enforced by DB unique constraints on
// stripe_invoice_id and stripe_credit_note_id.

import type Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

const COMMISSION_RATE = 0.2

interface EnquiryAttribution {
  enquiry_id: string
  partner_id: string
  group_id: string
}

async function resolveAttribution(
  supabase: ReturnType<typeof getSupabase>,
  groupId: string,
): Promise<EnquiryAttribution | null> {
  const { data: group, error: groupErr } = await supabase
    .from('groups')
    .select('id, partner_enquiry_id')
    .eq('id', groupId)
    .single()

  if (groupErr || !group?.partner_enquiry_id) return null

  const { data: enquiry, error: enqErr } = await supabase
    .from('partner_enquiries')
    .select('id, partner_id')
    .eq('id', group.partner_enquiry_id)
    .single()

  if (enqErr || !enquiry) return null

  return {
    enquiry_id: enquiry.id,
    partner_id: enquiry.partner_id,
    group_id: group.id,
  }
}

async function findGroupByCustomer(
  supabase: ReturnType<typeof getSupabase>,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  if (error || !data) return null
  return data.id
}

/**
 * Called after the core invoice.paid handler runs. Creates a commission row
 * only when the group is attributed to a partner enquiry. Idempotent via
 * the DB unique index on stripe_invoice_id (when credit_note_id is null).
 */
export async function handleInvoicePaidForPartner(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!customerId || !invoice.id) return

  const supabase = getSupabase()

  // Early exit: skip if no attribution. This is the hot path — 99% of
  // invoices have no partner_enquiry_id and should incur zero extra work.
  const groupId = await findGroupByCustomer(supabase, customerId)
  if (!groupId) return

  const attribution = await resolveAttribution(supabase, groupId)
  if (!attribution) return

  // `total_excluding_tax` is the post-discount, pre-tax amount the customer
  // actually pays on the invoice. This is the correct commission base.
  const customerNetCents =
    invoice.total_excluding_tax ?? invoice.subtotal_excluding_tax ?? invoice.subtotal ?? 0

  if (customerNetCents <= 0) {
    // Don't create zero-value rows (e.g. fully-discounted invoices).
    return
  }

  const commissionCents = Math.round(customerNetCents * COMMISSION_RATE)
  const paidAt = invoice.status_transitions?.paid_at
    ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
    : new Date().toISOString()

  const { error } = await supabase.from('partner_commissions').insert({
    partner_id: attribution.partner_id,
    enquiry_id: attribution.enquiry_id,
    group_id: attribution.group_id,
    stripe_invoice_id: invoice.id,
    invoice_paid_at: paidAt,
    customer_net_cents: customerNetCents,
    commission_rate: COMMISSION_RATE,
    commission_cents: commissionCents,
    currency: invoice.currency,
    status: 'pending',
  })

  if (error) {
    // 23505 = unique_violation → this invoice was already processed. Safe to ignore.
    if (error.code === '23505') {
      console.log(`[partners] commission already exists for invoice ${invoice.id} — skipping`)
      return
    }
    throw error
  }

  console.log(
    `[partners] commission created: invoice=${invoice.id} partner=${attribution.partner_id} ${commissionCents}c`,
  )
}

/**
 * Called when a Stripe credit note is issued. Creates an offsetting negative
 * commission row (keyed by credit note id for idempotency) and voids the
 * original pending commission. Paid-out commissions are left alone; the
 * negative offset reduces the next payout.
 */
export async function handleCreditNoteForPartner(
  creditNote: Stripe.CreditNote,
): Promise<void> {
  if (!creditNote.id || !creditNote.invoice) return

  const invoiceId = typeof creditNote.invoice === 'string'
    ? creditNote.invoice
    : creditNote.invoice.id

  if (!invoiceId) return

  const supabase = getSupabase()

  // Find the original commission row for this invoice.
  const { data: original, error: lookupErr } = await supabase
    .from('partner_commissions')
    .select('id, partner_id, enquiry_id, group_id, currency, status')
    .eq('stripe_invoice_id', invoiceId)
    .is('stripe_credit_note_id', null)
    .maybeSingle()

  if (lookupErr || !original) {
    // No partner commission on this invoice — nothing to offset.
    return
  }

  const creditNetCents =
    creditNote.total_excluding_tax ?? creditNote.subtotal_excluding_tax ?? creditNote.subtotal ?? 0

  if (creditNetCents <= 0) return

  const negativeCommissionCents = -Math.round(creditNetCents * COMMISSION_RATE)

  // Insert the offsetting row. Unique index on stripe_credit_note_id makes
  // this idempotent.
  const { error: insertErr } = await supabase.from('partner_commissions').insert({
    partner_id: original.partner_id,
    enquiry_id: original.enquiry_id,
    group_id: original.group_id,
    stripe_invoice_id: invoiceId,
    stripe_credit_note_id: creditNote.id,
    invoice_paid_at: new Date().toISOString(),
    customer_net_cents: -creditNetCents,
    commission_rate: COMMISSION_RATE,
    commission_cents: negativeCommissionCents,
    currency: original.currency,
    status: 'pending',
  })

  if (insertErr) {
    if (insertErr.code === '23505') {
      console.log(`[partners] credit note ${creditNote.id} already offset — skipping`)
      return
    }
    throw insertErr
  }

  // Void the original only if it hasn't been paid out — we can't rewrite history.
  if (original.status === 'pending') {
    await supabase
      .from('partner_commissions')
      .update({ status: 'voided' })
      .eq('id', original.id)
  }

  console.log(
    `[partners] credit note offset: cn=${creditNote.id} invoice=${invoiceId} ${negativeCommissionCents}c`,
  )
}
