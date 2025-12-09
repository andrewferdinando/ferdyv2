import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ANDREW_EMAIL = 'andrew@adhoc.help'

async function migrateAndrewBrands() {
  console.log('🔄 Starting migration for Andrew\'s brands...\n')

  try {
    // 1. Find Andrew's user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', ANDREW_EMAIL)
      .single()

    if (userError || !userData) {
      // Try auth.users table instead
      const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()
      
      const andrew = authUser?.users.find(u => u.email === ANDREW_EMAIL)
      
      if (!andrew) {
        throw new Error(`User not found with email: ${ANDREW_EMAIL}`)
      }

      console.log(`✓ Found user: ${andrew.email} (${andrew.id})\n`)

      // 2. Create a default Group
      console.log('Creating default Group...')
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: 'Andrew\'s Brands',
          price_per_brand_cents: 8600,
          currency: 'usd',
        })
        .select()
        .single()

      if (groupError) {
        throw new Error(`Failed to create Group: ${groupError.message}`)
      }

      console.log(`✓ Created Group: ${newGroup.name} (${newGroup.id})\n`)

      // 3. Add Andrew as Group owner
      console.log('Adding Andrew as Group owner...')
      const { error: membershipError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: newGroup.id,
          user_id: andrew.id,
          role: 'owner',
        })

      if (membershipError) {
        throw new Error(`Failed to add Group membership: ${membershipError.message}`)
      }

      console.log(`✓ Andrew added as Group owner\n`)

      // 4. Get all brands without group_id
      const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select('id, name')
        .is('group_id', null)

      if (brandsError) {
        throw new Error(`Failed to fetch brands: ${brandsError.message}`)
      }

      if (!brands || brands.length === 0) {
        console.log('✅ No brands need migration!')
        return
      }

      console.log(`📊 Found ${brands.length} brands to migrate:\n`)

      // 5. Assign each brand to the Group and add Andrew as admin
      for (const brand of brands) {
        console.log(`   Processing: ${brand.name}`)

        // Assign to Group
        const { error: updateError } = await supabase
          .from('brands')
          .update({ group_id: newGroup.id })
          .eq('id', brand.id)

        if (updateError) {
          console.error(`   ❌ Failed to assign to Group: ${updateError.message}`)
          continue
        }

        // Check if Andrew already has brand membership
        const { data: existingMembership } = await supabase
          .from('brand_memberships')
          .select('id')
          .eq('brand_id', brand.id)
          .eq('user_id', andrew.id)
          .single()

        if (!existingMembership) {
          // Add Andrew as brand admin
          const { error: brandMembershipError } = await supabase
            .from('brand_memberships')
            .insert({
              brand_id: brand.id,
              user_id: andrew.id,
              role: 'admin',
            })

          if (brandMembershipError) {
            console.error(`   ❌ Failed to add brand membership: ${brandMembershipError.message}`)
            continue
          }

          console.log(`   ✓ Assigned to Group + added as admin`)
        } else {
          console.log(`   ✓ Assigned to Group (already a member)`)
        }
      }

      console.log('\n🎉 Migration complete!\n')
      console.log(`📊 Summary:`)
      console.log(`   - Group created: ${newGroup.name}`)
      console.log(`   - Brands migrated: ${brands.length}`)
      console.log(`   - User: ${andrew.email}`)
      console.log('')

    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateAndrewBrands()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
