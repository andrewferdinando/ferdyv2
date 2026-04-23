import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const params = request.nextUrl.searchParams
  const status = params.get('status')
  const partnerId = params.get('partner_id')
  const from = params.get('from')
  const to = params.get('to')

  // Disambiguate the groups join — there are two FKs between partner_enquiries
  // and groups (forward via group_id, backward via groups.partner_enquiry_id),
  // so PostgREST needs an explicit hint.
  let q = supabaseAdmin
    .from('partner_enquiries')
    .select(
      'id, partner_id, enquiry_date, prospect_company, prospect_contact_name, prospect_email, status, group_id, converted_at, expires_at, notes, created_at, partners(full_name, trading_name), groups!partner_enquiries_group_id_fkey(name)',
    )
    .order('enquiry_date', { ascending: false })

  if (status) q = q.eq('status', status)
  if (partnerId) q = q.eq('partner_id', partnerId)
  if (from) q = q.gte('enquiry_date', from)
  if (to) q = q.lte('enquiry_date', to)

  const { data, error } = await q
  if (error) {
    console.error('[super-admin/partners/enquiries GET]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ enquiries: data ?? [] })
}

const createSchema = z.object({
  partner_id: z.string().uuid(),
  enquiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  prospect_company: z.string().trim().min(1).max(200),
  prospect_contact_name: z.string().trim().min(1).max(200),
  prospect_email: z.string().trim().toLowerCase().email().max(320).optional().or(z.literal('')),
  notes: z.string().trim().max(5000).optional().or(z.literal('')),
})

export async function POST(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 },
    )
  }

  const data = parsed.data

  const { data: inserted, error } = await supabaseAdmin
    .from('partner_enquiries')
    .insert({
      partner_id: data.partner_id,
      enquiry_date: data.enquiry_date,
      prospect_company: data.prospect_company,
      prospect_contact_name: data.prospect_contact_name,
      prospect_email: data.prospect_email?.trim() || null,
      notes: data.notes?.trim() || null,
      status: 'new',
    })
    .select('id')
    .single()

  if (error || !inserted) {
    console.error('[super-admin/partners/enquiries POST]', error)
    return NextResponse.json({ error: error?.message || 'Failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: inserted.id })
}
