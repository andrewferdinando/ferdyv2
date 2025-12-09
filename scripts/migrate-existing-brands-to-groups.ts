import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateExistingBrands() {
  console.log('🔄 Starting migration: Assigning existing brands to Groups...\n')

  try {
    // 1. Get all brands that don't have a group_id
    const { data: brandsWithoutGroup, error: brandsError } = await supabase
      .from('brands')
      .select('id, name, created_at')
      .is('group_id', null)

    if (brandsError) {
      throw new Error(`Failed to fetch brands: ${brandsError.message}`)
    }

    if (!brandsWithoutGroup || brandsWithoutGroup.length === 0) {
      console.log('✅ No brands need migration. All brands already have groups!')
      return
    }

    console.log(`📊 Found ${brandsWithoutGroup.length} brands without groups:\n`)
    brandsWithoutGroup.forEach(brand => {
      console.log(`   - ${brand.name} (${brand.id})`)
    })
    console.log('')

    // 2. For each brand, find its owner(s) and create/assign a Group
    for (const brand of brandsWithoutGroup) {
      console.log(`\n🔧 Processing brand: ${brand.name}`)

      // Get brand owner(s)
      const { data: brandMemberships, error: membershipError } = await supabase
        .from('brand_memberships')
        .select('user_id, role')
        .eq('brand_id', brand.id)
        .eq('role', 'owner')

      if (membershipError) {
        console.error(`   ❌ Failed to get memberships: ${membershipError.message}`)
        continue
      }

      if (!brandMemberships || brandMemberships.length === 0) {
        console.log(`   ⚠️  No owner found, skipping...`)
        continue
      }

      const ownerId = brandMemberships[0].user_id

      // Check if user already has a Group
      const { data: existingMembership, error: groupCheckError } = await supabase
        .from('group_memberships')
        .select('group_id, groups(id, name)')
        .eq('user_id', ownerId)
        .eq('role', 'owner')
        .single()

      let groupId: string

      if (existingMembership && existingMembership.group_id) {
        // User already has a Group, use it
        groupId = existingMembership.group_id
        console.log(`   ✓ Using existing Group: ${(existingMembership.groups as any)?.name}`)
      } else {
        // Create a new Group for this user
        const { data: newGroup, error: groupError } = await supabase
          .from('groups')
          .insert({
            name: `${brand.name} Account`,
            price_per_brand_cents: 8600,
            currency: 'usd',
          })
          .select()
          .single()

        if (groupError) {
          console.error(`   ❌ Failed to create Group: ${groupError.message}`)
          continue
        }

        groupId = newGroup.id
        console.log(`   ✓ Created new Group: ${newGroup.name}`)

        // Add user as Group owner
        const { error: membershipInsertError } = await supabase
          .from('group_memberships')
          .insert({
            group_id: groupId,
            user_id: ownerId,
            role: 'owner',
          })

        if (membershipInsertError) {
          console.error(`   ❌ Failed to add user to Group: ${membershipInsertError.message}`)
          continue
        }

        console.log(`   ✓ Added user as Group owner`)
      }

      // Assign brand to Group
      const { error: updateError } = await supabase
        .from('brands')
        .update({ group_id: groupId })
        .eq('id', brand.id)

      if (updateError) {
        console.error(`   ❌ Failed to assign brand to Group: ${updateError.message}`)
        continue
      }

      console.log(`   ✅ Brand "${brand.name}" assigned to Group`)
    }

    console.log('\n\n🎉 Migration complete!\n')

    // Summary
    const { data: finalCheck } = await supabase
      .from('brands')
      .select('id')
      .is('group_id', null)

    console.log(`📊 Summary:`)
    console.log(`   - Brands processed: ${brandsWithoutGroup.length}`)
    console.log(`   - Brands still without Group: ${finalCheck?.length || 0}`)
    console.log('')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migrateExistingBrands()
  .then(() => {
    console.log('✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
