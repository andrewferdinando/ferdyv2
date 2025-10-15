import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin, requireAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { brandId, email, role } = await request.json()

    if (!brandId || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: brandId, email, role' },
        { status: 400 }
      )
    }

    if (!['admin', 'editor'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or editor' },
        { status: 400 }
      )
    }

    // Get current user session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user has admin access to this brand
    const hasAdminAccess = await requireAdmin(brandId, session.user.id)
    
    if (!hasAdminAccess) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const user = existingUser?.users?.find(u => u.email === email)

    let userId: string

    if (user) {
      userId = user.id
    } else {
      // Create new user via admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false, // User will need to confirm email
        user_metadata: {
          invited_by: session.user.id,
          invited_at: new Date().toISOString()
        }
      })

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json(
          { error: 'Failed to create user account' },
          { status: 500 }
        )
      }

      userId = newUser.user.id
    }

    // Ensure profile exists
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        email,
        full_name: '',
        role: 'user', // Default role
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return NextResponse.json(
        { error: 'Failed to create user profile' },
        { status: 500 }
      )
    }

    // Add user to brand with specified role
    const { error: membershipError } = await supabaseAdmin
      .from('brand_memberships')
      .upsert({
        brand_id: brandId,
        user_id: userId,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (membershipError) {
      console.error('Error creating brand membership:', membershipError)
      return NextResponse.json(
        { error: 'Failed to add user to brand' },
        { status: 500 }
      )
    }

    // Send invitation email if user doesn't exist
    if (!user) {
      try {
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/sign-in`
        })
      } catch (inviteError) {
        console.error('Error sending invitation email:', inviteError)
        // Don't fail the request if email sending fails
      }
    }

    return NextResponse.json({ 
      ok: true, 
      message: user ? 'User added to brand' : 'User invited and added to brand'
    })

  } catch (error) {
    console.error('Error in invite API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
