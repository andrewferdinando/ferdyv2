import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  try {
    // Get current user from session using server-side client
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's group membership
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'No group membership found' }, { status: 404 })
    }

    // Get all group members
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('group_memberships')
      .select('user_id, role')
      .eq('group_id', membership.group_id)

    if (membershipsError) {
      console.error('[team/members API] Error fetching memberships:', membershipsError)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // Fetch user details from auth.users for each member
    const members = []
    for (const m of memberships || []) {
      try {
        const { data: { user: authUser }, error: userError } = await supabaseAdmin.auth.admin.getUserById(m.user_id)
        
        if (userError) {
          console.error('[team/members API] Error fetching user:', m.user_id, userError)
          members.push({
            id: m.user_id,
            name: 'Unknown',
            role: m.role || 'member'
          })
          continue
        }

        // Get name from user metadata or email
        const name = authUser?.user_metadata?.name || 
                    authUser?.user_metadata?.full_name || 
                    authUser?.email?.split('@')[0] || 
                    'Unknown'

        members.push({
          id: m.user_id,
          name,
          role: m.role || 'member'
        })
      } catch (err) {
        console.error('[team/members API] Exception fetching user:', m.user_id, err)
        members.push({
          id: m.user_id,
          name: 'Unknown',
          role: m.role || 'member'
        })
      }
    }

    return NextResponse.json({ members })
  } catch (error) {
    console.error('[team/members API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
