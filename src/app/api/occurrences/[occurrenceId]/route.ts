import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ occurrenceId: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { occurrenceId } = await params
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

    const updateData: Record<string, unknown> = {
      start_date,
      end_date: end_date || start_date,
      time_of_day: Array.isArray(time_of_day) ? time_of_day : [time_of_day],
      channels,
      updated_at: new Date().toISOString()
    }

    if (timezone) updateData.timezone = timezone
    if (days_before !== undefined) updateData.days_before = days_before
    if (days_during !== undefined) updateData.days_during = days_during

    const { data, error } = await supabase
      .from('schedule_rules')
      .update(updateData)
      .eq('id', occurrenceId)
      .eq('frequency', 'specific') // Ensure we're only updating specific frequency rules
      .select()
      .single()

    if (error) {
      console.error('Error updating occurrence:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Occurrence not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ occurrence: data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ occurrenceId: string }> }
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { occurrenceId } = await params

    // Soft delete by setting archived_at
    const { data, error } = await supabase
      .from('schedule_rules')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', occurrenceId)
      .eq('frequency', 'specific')
      .select()
      .single()

    if (error) {
      console.error('Error archiving occurrence:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Occurrence not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

