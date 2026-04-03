import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-server'
import { addContactToAudience, getAudienceId, removeContactFromAudience } from '@/lib/newsletter/resend'
import { isTestUserEmail } from '@/lib/newsletter/test-users'

export const runtime = 'nodejs'

function extractToken(request: NextRequest) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

async function authenticateSuperAdmin(request: NextRequest) {
  const token = extractToken(request)
  if (!token) return null

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const superAdmin = await isSuperAdmin(user.id)
  if (!superAdmin) return null

  return user
}

export async function GET(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('newsletter_contacts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[newsletter/contacts] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }

  return NextResponse.json({ contacts: data })
}

export async function POST(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { first_name, last_name, email, contact_type } = body

    if (!first_name || !last_name || !email || !contact_type) {
      return NextResponse.json(
        { error: 'Missing required fields: first_name, last_name, email, contact_type' },
        { status: 400 }
      )
    }

    if (!['Prospect', 'Referrer', 'Friend'].includes(contact_type)) {
      return NextResponse.json(
        { error: 'Invalid contact_type. Must be Prospect, Referrer, or Friend' },
        { status: 400 }
      )
    }

    // Validate email is not a test user
    if (isTestUserEmail(email)) {
      return NextResponse.json(
        { error: 'Cannot add test user emails to newsletter audiences' },
        { status: 400 }
      )
    }

    // Check if email already exists in newsletter_contacts
    const { data: existing } = await supabaseAdmin
      .from('newsletter_contacts')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'A contact with this email already exists' },
        { status: 409 }
      )
    }

    // Add to Resend Non-customers audience
    const audienceId = getAudienceId('non_customers')
    const resendContact = await addContactToAudience(audienceId, {
      email,
      firstName: first_name,
      lastName: last_name,
    })

    // Insert into local table
    const { data: contact, error: insertError } = await supabaseAdmin
      .from('newsletter_contacts')
      .insert({
        first_name,
        last_name,
        email,
        contact_type,
        resend_contact_id: resendContact.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[newsletter/contacts] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 })
    }

    return NextResponse.json({ success: true, contact })
  } catch (error: any) {
    console.error('[newsletter/contacts] POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find all contacts missing a resend_contact_id
    const { data: unsynced, error: fetchError } = await supabaseAdmin
      .from('newsletter_contacts')
      .select('*')
      .is('resend_contact_id', null)
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('[newsletter/contacts] PATCH fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch unsynced contacts' }, { status: 500 })
    }

    if (!unsynced || unsynced.length === 0) {
      return NextResponse.json({ success: true, synced: 0, errors: 0, message: 'All contacts already synced' })
    }

    const audienceId = getAudienceId('non_customers')
    let synced = 0
    let errors = 0
    const errorDetails: string[] = []

    for (const contact of unsynced) {
      try {
        const resendContact = await addContactToAudience(audienceId, {
          email: contact.email,
          firstName: contact.first_name,
          lastName: contact.last_name,
        })

        await supabaseAdmin
          .from('newsletter_contacts')
          .update({ resend_contact_id: resendContact.id })
          .eq('id', contact.id)

        synced++
      } catch (err: any) {
        errors++
        errorDetails.push(`${contact.email}: ${err.message}`)
        console.error(`[newsletter/contacts] Sync failed for ${contact.email}:`, err.message)
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      errors,
      total: unsynced.length,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    })
  } catch (error: any) {
    console.error('[newsletter/contacts] PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const contactId = searchParams.get('id')

    if (!contactId) {
      return NextResponse.json({ error: 'Missing contact id' }, { status: 400 })
    }

    // Get the contact first
    const { data: contact, error: fetchError } = await supabaseAdmin
      .from('newsletter_contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (fetchError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Remove from Resend audience
    try {
      const audienceId = getAudienceId('non_customers')
      if (contact.resend_contact_id) {
        await removeContactFromAudience(audienceId, { id: contact.resend_contact_id })
      } else {
        await removeContactFromAudience(audienceId, { email: contact.email })
      }
    } catch (err: any) {
      console.warn(`[newsletter/contacts] Could not remove from Resend: ${err.message}`)
    }

    // Delete from local table
    const { error: deleteError } = await supabaseAdmin
      .from('newsletter_contacts')
      .delete()
      .eq('id', contactId)

    if (deleteError) {
      console.error('[newsletter/contacts] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[newsletter/contacts] DELETE error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
