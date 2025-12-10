import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendNewUserInvite, sendExistingUserInvite } from '@/lib/emails/send'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.ferdy.io'

interface BrandAssignment {
  brandId: string
  role: 'admin' | 'editor'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, groupRole, groupId, brandAssignments, inviterName } = body as {
      email: string
      groupRole: string
      groupId: string
      brandAssignments: BrandAssignment[]
      inviterName?: string
    }

    console.log('[team/invite] Received invite request:', { email, groupRole, groupId, brandCount: brandAssignments?.length })

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

    const normalizedEmail = email.trim().toLowerCase()

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser?.users.find(u => u.email?.toLowerCase() === normalizedEmail)

    console.log('[team/invite] User exists:', !!userExists)

    if (userExists) {
      // User exists - add them to the group and brands
      const userId = userExists.id

      // Check if already a member of this group
      const { data: existingMembership } = await supabaseAdmin
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
      const { error: groupError } = await supabaseAdmin
        .from('group_memberships')
        .insert({
          group_id: groupId,
          user_id: userId,
          role: groupRole,
        })

      if (groupError) {
        console.error('[team/invite] Error adding user to group:', groupError)
        throw new Error('Failed to add user to group')
      }

      // Add brand assignments
      if (brandAssignments && brandAssignments.length > 0) {
        const brandMemberships = brandAssignments.map(assignment => ({
          brand_id: assignment.brandId,
          user_id: userId,
          role: assignment.role,
        }))

        const { error: brandError } = await supabaseAdmin
          .from('brand_memberships')
          .insert(brandMemberships)

        if (brandError) {
          console.error('[team/invite] Error adding brand memberships:', brandError)
          // Don't fail the whole operation, just log it
        }
      }

      // Send notification email to existing user with magic link
      try {
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: normalizedEmail,
          options: {
            redirectTo: `${APP_URL}/brands`,
          },
        })

        if (linkError || !linkData?.properties?.action_link) {
          console.error('[team/invite] Error generating magic link:', linkError)
        } else {
          // Get brand names for the email
          let brandNames = 'your brands'
          if (brandAssignments && brandAssignments.length > 0) {
            const { data: brands } = await supabaseAdmin
              .from('brands')
              .select('name')
              .in('id', brandAssignments.map(b => b.brandId))
            
            if (brands && brands.length > 0) {
              brandNames = brands.map(b => b.name).join(', ')
            }
          }

          await sendExistingUserInvite({
            to: normalizedEmail,
            brandName: brandNames,
            inviterName: inviterName || 'A team member',
            magicLink: linkData.properties.action_link,
          })
          
          console.log('[team/invite] Sent existing user invite email to', normalizedEmail)
        }
      } catch (emailError) {
        console.error('[team/invite] Error sending existing user email:', emailError)
        // Don't fail the operation if email fails
      }

      return NextResponse.json({
        success: true,
        message: 'Existing user added to group and brands',
      })
    } else {
      // User doesn't exist - generate invite link and send custom email
      console.log('[team/invite] Processing new user invite')

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: normalizedEmail,
        options: {
          data: {
            group_id: groupId,
            group_role: groupRole,
            brand_assignments: brandAssignments,
            src: 'team_invite',
          },
          redirectTo: `${APP_URL}/auth/set-password?src=invite&group_id=${groupId}`,
        },
      })

      if (inviteError || !inviteData?.properties?.action_link) {
        console.error('[team/invite] Error generating invite link:', inviteError)
        throw new Error('Failed to generate invite link')
      }

      // Get brand names for the email
      let brandNames = 'your brands'
      if (brandAssignments && brandAssignments.length > 0) {
        const { data: brands } = await supabaseAdmin
          .from('brands')
          .select('name')
          .in('id', brandAssignments.map(b => b.brandId))
        
        if (brands && brands.length > 0) {
          brandNames = brands.map(b => b.name).join(', ')
        }
      }

      // Send custom branded email via Resend
      try {
        await sendNewUserInvite({
          to: normalizedEmail,
          brandName: brandNames,
          inviterName: inviterName || 'A team member',
          inviteLink: inviteData.properties.action_link,
        })
        console.log('[team/invite] Sent new user invite email to', normalizedEmail)
      } catch (emailError) {
        console.error('[team/invite] Failed to send new user invite email:', emailError)
        throw new Error('Failed to send invite email')
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully',
      })
    }
  } catch (error: any) {
    console.error('[team/invite] Error in team invite API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
