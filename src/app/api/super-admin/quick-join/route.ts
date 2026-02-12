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

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateSuperAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

    // Fetch all brands with their group name
    let brandsQuery = supabaseAdmin
      .from('brands')
      .select('id, name, group_id, groups!inner(name)')
      .eq('status', 'active')
      .order('name')

    if (q) {
      brandsQuery = brandsQuery.ilike('name', `%${q}%`)
    }

    const { data: brands, error: brandsError } = await brandsQuery

    if (brandsError) {
      return NextResponse.json({ error: brandsError.message }, { status: 500 })
    }

    // Fetch user's brand memberships
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('brand_memberships')
      .select('brand_id')
      .eq('user_id', user.id)

    if (membershipsError) {
      return NextResponse.json({ error: membershipsError.message }, { status: 500 })
    }

    const memberBrandIds = new Set((memberships ?? []).map((m) => m.brand_id))

    const result = (brands ?? []).map((brand: any) => ({
      id: brand.id,
      name: brand.name,
      group_id: brand.group_id,
      group_name: brand.groups?.name ?? 'Unknown',
      is_member: memberBrandIds.has(brand.id),
    }))

    return NextResponse.json({ brands: result })
  } catch (error) {
    console.error('[quick-join GET] unexpected error', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateSuperAdmin(request)
    if (!user) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { brandId } = await request.json()
    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
    }

    // Look up the brand and its group
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .select('id, name, group_id')
      .eq('id', brandId)
      .single()

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 })
    }

    // Step 1: Upsert into group_memberships (required by DB trigger before brand membership)
    const { error: groupError } = await supabaseAdmin
      .from('group_memberships')
      .upsert(
        {
          user_id: user.id,
          group_id: brand.group_id,
          role: 'admin',
        },
        { onConflict: 'user_id,group_id' },
      )

    if (groupError) {
      console.error('[quick-join POST] group membership upsert failed', {
        error: groupError.message,
      })
      return NextResponse.json({ error: groupError.message }, { status: 500 })
    }

    // Step 2: Upsert into brand_memberships
    const { error: brandMemberError } = await supabaseAdmin
      .from('brand_memberships')
      .upsert(
        {
          user_id: user.id,
          brand_id: brand.id,
          role: 'admin',
        },
        { onConflict: 'user_id,brand_id' },
      )

    if (brandMemberError) {
      console.error('[quick-join POST] brand membership upsert failed', {
        error: brandMemberError.message,
      })
      return NextResponse.json({ error: brandMemberError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, brandName: brand.name })
  } catch (error) {
    console.error('[quick-join POST] unexpected error', {
      error: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
