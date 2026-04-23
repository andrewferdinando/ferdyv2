import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'

export const runtime = 'nodejs'

interface Ctx {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params
  const month = request.nextUrl.searchParams.get('month') // YYYY-MM

  let q = supabaseAdmin
    .from('partner_commissions')
    .select('id, stripe_invoice_id, stripe_credit_note_id, invoice_paid_at, customer_net_cents, commission_cents, commission_rate, currency, status, payout_id, group_id, groups(name)')
    .eq('partner_id', id)
    .order('invoice_paid_at', { ascending: false })

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split('-').map(Number)
    const start = new Date(Date.UTC(y!, m! - 1, 1)).toISOString()
    const end = new Date(Date.UTC(y!, m!, 1)).toISOString()
    q = q.gte('invoice_paid_at', start).lt('invoice_paid_at', end)
  }

  const { data, error } = await q

  if (error) {
    console.error('[super-admin/partners/[id]/commissions GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ commissions: data ?? [] })
}
