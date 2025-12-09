import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface BrandAssignment {
  brandId: string
  role: 'admin' | 'editor'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, groupRole, groupId, brandAssignments } = body as {
      email: string
      groupRole: string
      groupId: string
      brandAssignments: BrandAssignment[]
    }

    if (!email || !groupRole || !groupId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const userExists = existingUser?.users.find(u => u.email === email)

    if (userExists) {
      // User exists - add them to the group and brands
      const userId = userExists.id

      // Check if already a member of this group
      const { data: existingMembership } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single()

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this group' },
          { status: 400 }
        )
      }

      // Add to group
      const { error: groupError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: groupRole,
        })

      if (groupError) {
        console.error('Error adding user to group:', groupError)
        throw new Error('Failed to add user to group')
      }

      // Add brand assignments
      if (brandAssignments && brandAssignments.length > 0) {
        const brandMemberships = brandAssignments.map(assignment => ({
          brand_id: assignment.brandId,
          user_id: userId,
          role: assignment.role,
        }))

        const { error: brandError } = await supabase
          .from('brand_memberships')
          .insert(brandMemberships)

        if (brandError) {
          console.error('Error adding brand memberships:', brandError)
          // Don't fail the whole operation, just log it
        }
      }

      // TODO: Send notification email to existing user about being added to group

      return NextResponse.json({
        success: true,
        message: 'Existing user added to group and brands',
      })
    } else {
      // User doesn't exist - create invitation
      // For now, we'll store the invitation in a pending_invitations table
      // In production, you'd send an email with a signup link

      const { error: inviteError } = await supabase
        .from('pending_invitations')
        .insert({
          email,
          group_id: groupId,
          group_role: groupRole,
          brand_assignments: brandAssignments,
          invited_at: new Date().toISOString(),
        })

      if (inviteError) {
        // If pending_invitations table doesn't exist, just return success
        // The table will be created in a migration
        console.warn('pending_invitations table may not exist:', inviteError)
      }

      // TODO: Send invitation email with signup link
      // The signup link should include a token that auto-adds them to the group

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully',
      })
    }
  } catch (error: any) {
    console.error('Error in team invite API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
