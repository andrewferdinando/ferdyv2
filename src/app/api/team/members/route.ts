import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/team/members
 * Fetches all members of the current user's group
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('[team/members API] No authorization header')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.replace('Bearer ', '')
    
    // Verify the token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('[team/members API] Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[team/members API] Fetching members for user:', user.id)

    // Get user's group memberships (user may belong to multiple groups)
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (membershipError || !memberships || memberships.length === 0) {
      console.error('[team/members API] No group membership found:', membershipError)
      return NextResponse.json({ error: 'No group membership found' }, { status: 404 })
    }

    // Use the first (oldest) group membership for now
    // TODO: In the future, allow users to switch between groups
    const membership = memberships[0]

    console.log('[team/members API] Found group:', membership.group_id)

    // Get all group members
    const { data: memberships, error: membershipsError } = await supabaseAdmin
      .from('group_memberships')
      .select('user_id, role')
      .eq('group_id', membership.group_id)

    if (membershipsError) {
      console.error('[team/members API] Error fetching memberships:', membershipsError)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    console.log('[team/members API] Found', memberships?.length || 0, 'members')

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

    console.log('[team/members API] Returning', members.length, 'members')
    return NextResponse.json({ members })
  } catch (error) {
    console.error('[team/members API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
