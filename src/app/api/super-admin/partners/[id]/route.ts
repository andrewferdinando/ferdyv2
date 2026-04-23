import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { authenticateSuperAdmin } from '@/lib/server/super-admin-auth'
import { encryptToken } from '@/lib/encryption'
import { safeDecrypt } from '@/lib/server/partners'

export const runtime = 'nodejs'

interface Ctx {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, ctx: Ctx) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params

  const { data: partner, error } = await supabaseAdmin
    .from('partners')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !partner) {
    return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
  }

  // Decrypt sensitive fields for the admin UI.
  const bank_account_number = safeDecrypt(partner.bank_account_number_encrypted)
  const wise_email = safeDecrypt(partner.wise_email_encrypted)

  const { bank_account_number_encrypted, wise_email_encrypted, ...rest } = partner

  return NextResponse.json({
    partner: {
      ...rest,
      bank_account_number,
      wise_email,
    },
  })
}

const updateSchema = z.object({
  full_name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().toLowerCase().email().max(320).optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  country: z.enum(['NZ', 'AU', 'Other']).optional(),
  trading_name: z.string().trim().min(1).max(200).optional(),
  entity_type: z.enum(['Sole trader', 'Company', 'Partnership', 'Trust', 'Other']).optional(),
  company_number: z.string().trim().max(100).nullable().optional(),
  business_address: z.string().trim().min(1).max(1000).optional(),
  gst_registered: z.boolean().optional(),
  gst_number: z.string().trim().max(50).nullable().optional(),
  bank_account_name: z.string().trim().min(1).max(200).optional(),
  bank_account_number: z.string().trim().min(1).max(100).optional(),
  wise_email: z.string().trim().toLowerCase().email().max(320).nullable().optional().or(z.literal('')),
  status: z.enum(['active', 'paused', 'terminated']).optional(),
  stripe_promotion_code_id: z.string().trim().max(100).nullable().optional(),
  discount_code_display: z.string().trim().max(100).nullable().optional(),
  discount_code_notes: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
})

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const user = await authenticateSuperAdmin(request)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await ctx.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid payload' },
      { status: 400 },
    )
  }

  const data = parsed.data
  const update: Record<string, unknown> = {}

  for (const key of [
    'full_name',
    'email',
    'phone',
    'country',
    'trading_name',
    'entity_type',
    'company_number',
    'business_address',
    'gst_registered',
    'gst_number',
    'bank_account_name',
    'status',
    'stripe_promotion_code_id',
    'discount_code_display',
    'discount_code_notes',
    'notes',
  ] as const) {
    if (data[key] !== undefined) {
      // Coerce empty strings to null for nullable fields.
      if (typeof data[key] === 'string' && data[key] === '' && key !== 'status') {
        update[key] = null
      } else {
        update[key] = data[key]
      }
    }
  }

  if (data.bank_account_number !== undefined) {
    try {
      update.bank_account_number_encrypted = encryptToken(data.bank_account_number)
    } catch (err) {
      console.error('[super-admin/partners PATCH] bank encryption failed:', err)
      return NextResponse.json({ error: 'Encryption failed' }, { status: 500 })
    }
  }

  if (data.wise_email !== undefined) {
    const trimmed = typeof data.wise_email === 'string' ? data.wise_email.trim() : ''
    if (!trimmed) {
      update.wise_email_encrypted = null
    } else {
      try {
        update.wise_email_encrypted = encryptToken(trimmed)
      } catch (err) {
        console.error('[super-admin/partners PATCH] wise encryption failed:', err)
        return NextResponse.json({ error: 'Encryption failed' }, { status: 500 })
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabaseAdmin.from('partners').update(update).eq('id', id)
  if (error) {
    console.error('[super-admin/partners PATCH]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
