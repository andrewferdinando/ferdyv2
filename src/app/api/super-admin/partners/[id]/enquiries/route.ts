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

  // Disambiguate the groups join — two FKs exist between partner_enquiries
  // and groups (forward + backward), so PostgREST needs an explicit hint.
  const { data, error } = await supabaseAdmin
    .from('partner_enquiries')
    .select('id, enquiry_date, prospect_company, prospect_contact_name, prospect_email, status, group_id, converted_at, expires_at, notes, created_at, groups!partner_enquiries_group_id_fkey(name)')
    .eq('partner_id', id)
    .order('enquiry_date', { ascending: false })

  if (error) {
    console.error('[super-admin/partners/[id]/enquiries GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enquiries: data ?? [] })
}
