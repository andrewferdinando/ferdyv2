import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { encryptToken } from '@/lib/encryption'
import { checkRateLimit, extractClientIp } from '@/lib/rate-limit-inmem'
import {
  sendPartnerRegistrationConfirmation,
  sendPartnerRegistrationNotification,
} from '@/lib/emails/partnerEmails'

export const runtime = 'nodejs'

const registrationSchema = z
  .object({
    full_name: z.string().trim().min(1, 'Full name is required').max(200),
    email: z.string().trim().toLowerCase().email('Invalid email').max(320),
    phone: z.string().trim().max(50).optional().or(z.literal('')),
    country: z.enum(['NZ', 'AU', 'Other']),
    trading_name: z.string().trim().min(1, 'Trading name is required').max(200),
    entity_type: z.enum(['Sole trader', 'Company', 'Partnership', 'Trust', 'Other']),
    company_number: z.string().trim().max(100).optional().or(z.literal('')),
    business_address: z.string().trim().min(1, 'Business address is required').max(1000),
    gst_registered: z.boolean(),
    gst_number: z.string().trim().max(50).optional().or(z.literal('')),
    bank_account_name: z.string().trim().min(1, 'Bank account name is required').max(200),
    bank_account_number: z.string().trim().min(1, 'Bank account number is required').max(100),
    wise_email: z.string().trim().toLowerCase().email('Invalid Wise email').max(320).optional().or(z.literal('')),
    tcs_accepted: z.literal(true, { message: 'You must accept the terms' }),
  })
  .superRefine((data, ctx) => {
    if (data.gst_registered && !data.gst_number?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['gst_number'],
        message: 'GST number is required when GST-registered',
      })
    }
    if (data.country !== 'NZ' && !data.wise_email?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['wise_email'],
        message: 'Wise email is required for non-NZ partners',
      })
    }
  })

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase server env vars missing')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: NextRequest) {
  // Rate limit: 5 submissions per IP per hour.
  const ip = extractClientIp(request.headers)
  const rate = checkRateLimit({
    key: `partners-register:${ip}`,
    max: 5,
    windowMs: 60 * 60 * 1000,
  })
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = registrationSchema.safeParse(body)
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]
    return NextResponse.json(
      {
        error: firstIssue?.message || 'Invalid submission',
        field: firstIssue?.path.join('.') || null,
      },
      { status: 400 },
    )
  }

  const data = parsed.data
  const supabase = getSupabaseAdmin()

  // Duplicate email check - friendly message instead of DB error.
  const { data: existing } = await supabase
    .from('partners')
    .select('id')
    .eq('email', data.email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'This email is already registered as a partner.' },
      { status: 409 },
    )
  }

  // Encrypt sensitive fields at rest.
  let bankAccountEncrypted: string
  let wiseEmailEncrypted: string | null = null
  try {
    bankAccountEncrypted = encryptToken(data.bank_account_number)
    if (data.wise_email && data.wise_email.trim()) {
      wiseEmailEncrypted = encryptToken(data.wise_email.trim())
    }
  } catch (err) {
    console.error('[partners/register] encryption failed:', err)
    return NextResponse.json(
      { error: 'Server configuration error. Please contact andrew@ferdy.io.' },
      { status: 500 },
    )
  }

  const insertRow = {
    status: 'active' as const,
    full_name: data.full_name,
    email: data.email,
    phone: data.phone?.trim() || null,
    country: data.country,
    trading_name: data.trading_name,
    entity_type: data.entity_type,
    company_number: data.company_number?.trim() || null,
    business_address: data.business_address,
    gst_registered: data.gst_registered,
    gst_number: data.gst_registered ? (data.gst_number?.trim() || null) : null,
    bank_account_name: data.bank_account_name,
    bank_account_number_encrypted: bankAccountEncrypted,
    wise_email_encrypted: wiseEmailEncrypted,
    tcs_accepted_at: new Date().toISOString(),
  }

  const { data: inserted, error: insertError } = await supabase
    .from('partners')
    .insert(insertRow)
    .select('id')
    .single()

  if (insertError || !inserted) {
    // Catch the race condition on unique email constraint.
    if (insertError?.code === '23505') {
      return NextResponse.json(
        { error: 'This email is already registered as a partner.' },
        { status: 409 },
      )
    }
    console.error('[partners/register] insert failed:', insertError)
    return NextResponse.json(
      { error: 'Could not save your registration. Please try again.' },
      { status: 500 },
    )
  }

  // Send both emails. Individual failures are logged but do not fail the
  // request - the partner is already saved, and Andrew can follow up manually.
  try {
    await sendPartnerRegistrationConfirmation({
      to: data.email,
      fullName: data.full_name,
      tradingName: data.trading_name,
    })
  } catch (err) {
    console.error('[partners/register] confirmation email failed:', err)
  }

  try {
    await sendPartnerRegistrationNotification({
      fullName: data.full_name,
      email: data.email,
      phone: data.phone?.trim() || null,
      country: data.country,
      tradingName: data.trading_name,
      entityType: data.entity_type,
      companyNumber: data.company_number?.trim() || null,
      businessAddress: data.business_address,
      gstRegistered: data.gst_registered,
      gstNumber: data.gst_registered ? (data.gst_number?.trim() || null) : null,
      partnerId: inserted.id,
    })
  } catch (err) {
    console.error('[partners/register] notification email failed:', err)
  }

  return NextResponse.json({ ok: true, id: inserted.id })
}
