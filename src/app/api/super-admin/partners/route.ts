import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'
import { loadPartnerStats } from '@/lib/server/partners'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: partners, error } = await supabaseAdmin
    .from('partners')
    .select(
      'id, status, full_name, email, country, trading_name, entity_type, gst_registered, discount_code_display, created_at',
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[super-admin/partners GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const stats = await loadPartnerStats((partners ?? []).map((p) => p.id))

  const result = (partners ?? []).map((p) => ({
    ...p,
    ...(stats.get(p.id) ?? {
      active_sales_count: 0,
      ytd_commission_cents: 0,
      unpaid_balance_cents: 0,
    }),
  }))

  return NextResponse.json({ partners: result })
}
