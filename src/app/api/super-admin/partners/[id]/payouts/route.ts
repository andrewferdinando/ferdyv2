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

  const { data, error } = await supabaseAdmin
    .from('partner_payouts')
    .select('*')
    .eq('partner_id', id)
    .order('period_start', { ascending: false })

  if (error) {
    console.error('[super-admin/partners/[id]/payouts GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ payouts: data ?? [] })
}
