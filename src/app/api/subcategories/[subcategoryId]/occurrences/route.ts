import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(
  request: NextRequest,
  { params }: { params: { subcategoryId: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { subcategoryId } = params

    const { data, error } = await supabase
      .from('schedule_rules')
      .select('*')
      .eq('subcategory_id', subcategoryId)
      .eq('frequency', 'specific')
      .is('archived_at', null) // Only return non-archived occurrences
      .order('start_date', { ascending: true })

    if (error) {
      console.error('Error fetching occurrences:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ occurrences: data || [] })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { subcategoryId: string } }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { subcategoryId } = params
    const body = await request.json()

    const {
      start_date,
      end_date,
      time_of_day,
      channels,
      timezone,
      days_before,
      days_during
    } = body

    // Validation
    if (!start_date || !time_of_day || !channels || channels.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: start_date, time_of_day, channels' },
        { status: 400 }
      )
    }

    // Get subcategory to get brand_id and category_id
    const { data: subcategory, error: subcatError } = await supabase
      .from('subcategories')
      .select('brand_id, category_id, name')
      .eq('id', subcategoryId)
      .single()

    if (subcatError || !subcategory) {
      return NextResponse.json(
        { error: 'Subcategory not found' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('schedule_rules')
      .insert({
        brand_id: subcategory.brand_id,
        subcategory_id: subcategoryId,
        category_id: subcategory.category_id,
        frequency: 'specific',
        start_date,
        end_date: end_date || start_date, // Use start_date if end_date not provided
        time_of_day: Array.isArray(time_of_day) ? time_of_day : [time_of_day],
        channels,
        timezone: timezone || 'Pacific/Auckland',
        days_before: days_before || [],
        days_during: days_during || null,
        is_active: true,
        name: `${subcategory.name} – Specific`
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating occurrence:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ occurrence: data }, { status: 201 })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

