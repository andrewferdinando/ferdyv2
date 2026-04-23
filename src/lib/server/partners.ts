import { supabaseAdmin } from '@/lib/supabase-server'
import { decryptToken } from '@/lib/encryption'

export interface PartnerStats {
  active_sales_count: number
  ytd_commission_cents: number
  unpaid_balance_cents: number
}

/**
 * Compute summary stats for a list of partners in a single round-trip.
 * Returns a map keyed by partner_id.
 */
export async function loadPartnerStats(
  partnerIds: string[],
): Promise<Map<string, PartnerStats>> {
  const stats = new Map<string, PartnerStats>()
  partnerIds.forEach((id) =>
    stats.set(id, {
      active_sales_count: 0,
      ytd_commission_cents: 0,
      unpaid_balance_cents: 0,
    }),
  )

  if (partnerIds.length === 0) return stats

  const yearStart = new Date(new Date().getUTCFullYear(), 0, 1).toISOString()

  const [commissionsResult, salesResult] = await Promise.all([
    supabaseAdmin
      .from('partner_commissions')
      .select('partner_id, commission_cents, status, invoice_paid_at')
      .in('partner_id', partnerIds),
    supabaseAdmin
      .from('partner_enquiries')
      .select('partner_id')
      .in('partner_id', partnerIds)
      .eq('status', 'converted'),
  ])

  if (commissionsResult.data) {
    for (const row of commissionsResult.data) {
      const entry = stats.get(row.partner_id)
      if (!entry) continue
      if (row.status === 'pending') {
        entry.unpaid_balance_cents += row.commission_cents
      }
      if (row.status !== 'voided' && row.invoice_paid_at >= yearStart) {
        entry.ytd_commission_cents += row.commission_cents
      }
    }
  }

  if (salesResult.data) {
    for (const row of salesResult.data) {
      const entry = stats.get(row.partner_id)
      if (entry) entry.active_sales_count += 1
    }
  }

  return stats
}

/**
 * Decrypt bank details for a single partner. Errors are logged and the field
 * returned as null (caller decides how to display).
 */
export function safeDecrypt(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return decryptToken(value)
  } catch (err) {
    console.error('[partners] decryption failed', err)
    return null
  }
}
