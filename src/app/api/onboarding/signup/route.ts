import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      password,
      isMultipleBrands,
      groupName,
      brandName,
      websiteUrl,
      countryCode,
    } = body

    // Validate required fields
    if (!name || !email || !password || !brandName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (isMultipleBrands && !groupName) {
      return NextResponse.json(
        { error: 'Company/Agency name is required for multiple brands' },
        { status: 400 }
      )
    }

    // Auto-generate group name if single brand
    const finalGroupName = isMultipleBrands 
      ? groupName 
      : `${brandName}'s Account`

    // Create user account using admin client
    const { data: authData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: name,
      }
    })

    if (signUpError) {
      console.error('Signup error:', signUpError)
      return NextResponse.json(
        { error: signUpError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // Create profile (account-level role) - use upsert to handle duplicates
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userId,
        role: 'admin', // First user is always admin
        full_name: name,
      }, {
        onConflict: 'user_id'
      })

    if (profileError) {
      console.error('Profile error:', profileError)
      console.error('Profile error details:', JSON.stringify(profileError, null, 2))
      console.error('Attempted to insert:', { id: userId, user_id: userId, role: 'admin', full_name: name, email })
      // Rollback: delete user
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message || JSON.stringify(profileError)}` },
        { status: 500 }
      )
    }

    // Note: user_profiles is a VIEW, not a table - no insert needed
    // User data is stored in profiles.full_name and auth.users metadata

    // Create group
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .insert({
        name: finalGroupName,
        country_code: countryCode,
      })
      .select()
      .single()

    if (groupError) {
      console.error('Group error:', groupError)
      // Rollback
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
      await supabaseAdmin.from('profiles').delete().eq('user_id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create group' },
        { status: 500 }
      )
    }

    // Add user as admin of group
    const { error: memberError } = await supabaseAdmin
      .from('group_memberships')
      .insert({
        group_id: group.id,
        user_id: userId,
        role: 'admin',
      })

    if (memberError) {
      console.error('Group membership error:', memberError)
      // Rollback
      await supabaseAdmin.from('groups').delete().eq('id', group.id)
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
      await supabaseAdmin.from('profiles').delete().eq('user_id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to add user to group' },
        { status: 500 }
      )
    }

    // Create first brand
    const { data: brand, error: brandError } = await supabaseAdmin
      .from('brands')
      .insert({
        name: brandName,
        group_id: group.id,
        website_url: (websiteUrl && websiteUrl !== 'https://' && websiteUrl !== 'http://') ? websiteUrl : null,
        country_code: countryCode || null,
      })
      .select()
      .single()

    if (brandError) {
      console.error('Brand error:', brandError)
      // Rollback
      await supabaseAdmin.from('group_memberships').delete().eq('group_id', group.id)
      await supabaseAdmin.from('groups').delete().eq('id', group.id)
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
      await supabaseAdmin.from('profiles').delete().eq('user_id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create brand' },
        { status: 500 }
      )
    }

    // Add user to brand as admin
    const { error: brandMemberError } = await supabaseAdmin
      .from('brand_memberships')
      .insert({
        brand_id: brand.id,
        user_id: userId,
        role: 'admin',
      })

    if (brandMemberError) {
      console.error('Brand membership error:', brandMemberError)
      // Rollback
      await supabaseAdmin.from('brands').delete().eq('id', brand.id)
      await supabaseAdmin.from('group_memberships').delete().eq('group_id', group.id)
      await supabaseAdmin.from('groups').delete().eq('id', group.id)
      await supabaseAdmin.from('user_profiles').delete().eq('id', userId)
      await supabaseAdmin.from('profiles').delete().eq('user_id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to add user to brand' },
        { status: 500 }
      )
    }

    // Return success with group ID for payment step
    return NextResponse.json({
      success: true,
      userId,
      groupId: group.id,
      groupName: finalGroupName,
      email,
    })

  } catch (error: any) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      { error: error.message || 'Something went wrong' },
      { status: 500 }
    )
  }
}
