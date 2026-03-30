import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSuperAdmin } from '@/lib/supabase-server'

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

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) return null

  const superAdmin = await isSuperAdmin(user.id)
  if (!superAdmin) return null

  return user
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// GET - List all webinars with registration counts
export async function GET(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .rpc('get_webinars_with_counts')

  if (error) {
    // Fallback: query directly if RPC doesn't exist yet
    const { data: webinars, error: webErr } = await supabaseAdmin
      .from('webinars')
      .select('*')
      .order('datetime', { ascending: false })

    if (webErr) {
      return NextResponse.json({ error: webErr.message }, { status: 500 })
    }

    // Get registration counts per slug
    const slugs = (webinars || []).map((w) => w.slug)
    const { data: regCounts } = await supabaseAdmin
      .from('webinar_registrations')
      .select('webinar_slug')
      .in('webinar_slug', slugs)

    const countMap: Record<string, number> = {}
    for (const r of regCounts || []) {
      countMap[r.webinar_slug] = (countMap[r.webinar_slug] || 0) + 1
    }

    const result = (webinars || []).map((w) => ({
      ...w,
      registration_count: countMap[w.slug] || 0,
    }))

    return NextResponse.json({ webinars: result })
  }

  return NextResponse.json({ webinars: data })
}

// POST - Create a new webinar
export async function POST(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const {
    name,
    headline,
    sub_headline,
    niche,
    location,
    date_label,
    datetime,
    duration_minutes,
    zoom_url,
    spots,
    host_name,
    host_bio,
    what_you_will_learn,
  } = body

  if (!name || !headline || !date_label || !datetime) {
    return NextResponse.json(
      { error: 'Name, headline, date label, and datetime are required' },
      { status: 400 }
    )
  }

  const slug = toSlug(name)

  const { data, error } = await supabaseAdmin
    .from('webinars')
    .insert({
      slug,
      name,
      headline,
      sub_headline: sub_headline || '',
      niche: niche || '',
      location: location || '',
      date_label,
      datetime,
      duration_minutes: duration_minutes || 60,
      zoom_url: zoom_url || '',
      spots: spots || 50,
      host_name: host_name || 'Andrew',
      host_bio: host_bio || '',
      what_you_will_learn: what_you_will_learn || [],
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'A webinar with this name already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ webinar: data }, { status: 201 })
}

// PATCH - Update a webinar
export async function PATCH(request: NextRequest) {
  const user = await authenticateSuperAdmin(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Webinar ID is required' }, { status: 400 })
  }

  // Only allow updating specific fields
  const allowedFields = [
    'name', 'headline', 'sub_headline', 'niche', 'location',
    'date_label', 'datetime', 'duration_minutes', 'zoom_url', 'spots',
    'host_name', 'host_bio', 'what_you_will_learn', 'status',
    'attendance_count', 'onboarding_booked_count',
  ]

  const filtered: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowedFields) {
    if (key in updates) {
      filtered[key] = updates[key]
    }
  }

  const { data, error } = await supabaseAdmin
    .from('webinars')
    .update(filtered)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ webinar: data })
}
