'use server'

import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'

const CreateBrandPayloadSchema = z.object({
  userId: z.string().uuid('User session is invalid. Please sign in again.'),
  groupId: z.string().uuid('Group ID is required'),
  name: z
    .string()
    .trim()
    .min(1, 'Brand name is required'),
  websiteUrl: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => {
        if (!value) return true
        try {
          const url = new URL(value)
          return url.protocol === 'http:' || url.protocol === 'https:'
        } catch {
          return false
        }
      },
      { message: 'Website URL must start with http:// or https://' }
    ),
  countryCode: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || /^[A-Z]{2}$/i.test(value),
      { message: 'Country must be a valid ISO code' }
    ),
  timezone: z
    .string()
    .trim()
    .min(1, 'Time zone is required'),
})

type CreateBrandPayload = z.infer<typeof CreateBrandPayloadSchema>

export async function createBrandAction(payload: CreateBrandPayload) {
  const parsed = CreateBrandPayloadSchema.safeParse(payload)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? 'Invalid brand details.'
    throw new Error(firstError)
  }

  const { userId, groupId, name, websiteUrl, countryCode, timezone } = parsed.data

  // Verify user is owner or admin of the group
  const { data: membership, error: memberError } = await supabaseAdmin
    .from('group_memberships')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()

  if (memberError || !membership) {
    throw new Error('You do not have access to this group.')
  }

  if (!['admin', 'super_admin'].includes(membership.role)) {
    throw new Error('You do not have permission to create brands in this group.')
  }

  // Create brand
  const { data: brand, error: brandError } = await supabaseAdmin
    .from('brands')
    .insert({
      name,
      group_id: groupId,
      website_url: websiteUrl || null,
      country_code: countryCode || null,
      timezone,
    })
    .select()
    .single()

  if (brandError) {
    console.error('createBrandAction: Failed to create brand', brandError)
    throw new Error('Creating the brand failed. Please try again.')
  }

  // Add user as brand admin
  const { error: brandMemberError } = await supabaseAdmin
    .from('brand_memberships')
    .insert({
      brand_id: brand.id,
      user_id: userId,
      role: 'admin',
    })

  if (brandMemberError) {
    console.error('createBrandAction: Failed to add user to brand', brandMemberError)
    // Rollback brand creation
    await supabaseAdmin.from('brands').delete().eq('id', brand.id)
    throw new Error('Failed to set up brand permissions. Please try again.')
  }

  // Get current brand count for the group
  const { count: brandCount } = await supabaseAdmin
    .from('brands')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)

  console.log(`[createBrandAction] Brand count for group ${groupId}: ${brandCount}`)

  // Update Stripe subscription quantity
  if (brandCount && brandCount > 0) {
    console.log(`[createBrandAction] Updating Stripe subscription quantity to ${brandCount}`)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ferdy.io'
      const response = await fetch(`${baseUrl}/api/stripe/update-quantity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
        body: JSON.stringify({
          groupId,
          brandCount,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[createBrandAction] Failed to update Stripe subscription quantity:`, errorText)
        // Don't throw - brand is created, just log the error
      } else {
        console.log(`[createBrandAction] Successfully updated Stripe subscription quantity to ${brandCount}`)
      }
    } catch (err) {
      console.error('[createBrandAction] Error updating Stripe subscription:', err)
      // Don't throw - brand is created, just log the error
    }
  } else {
    console.log(`[createBrandAction] Skipping Stripe update - brandCount is ${brandCount}`)
  }

  // Fire-and-forget: Generate AI summary via API endpoint
  if (websiteUrl && websiteUrl.trim()) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ferdy.io'
    const apiUrl = `${baseUrl}/api/brands/${brand.id}/generate-summary`
    
    console.log(`[createBrandAction] Triggering AI summary generation for brand ${brand.id} (${brand.name})`)
    
    setTimeout(() => {
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
      })
        .then((response) => {
          console.log(`[createBrandAction] API endpoint responded with status ${response.status} for brand ${brand.id}`)
        })
        .catch((err) => {
          console.error('[createBrandAction] Failed to trigger AI summary generation (non-blocking):', err)
        })
    }, 100)
  }

  return brand.id as string
}

export async function deleteBrandAction(brandId: string, userId: string) {
  // Get brand to find group
  const { data: brand, error: brandError } = await supabaseAdmin
    .from('brands')
    .select('group_id')
    .eq('id', brandId)
    .single()

  if (brandError || !brand) {
    throw new Error('Brand not found.')
  }

  // Verify user is admin of the group
  const { data: membership, error: memberError } = await supabaseAdmin
    .from('group_memberships')
    .select('role')
    .eq('group_id', brand.group_id)
    .eq('user_id', userId)
    .single()

  if (memberError || !membership) {
    throw new Error('You do not have access to this group.')
  }

  if (!['admin', 'super_admin'].includes(membership.role)) {
    throw new Error('Only group admins can delete brands.')
  }

  // Delete brand (cascade will handle brand_memberships)
  const { error: deleteError } = await supabaseAdmin
    .from('brands')
    .delete()
    .eq('id', brandId)

  if (deleteError) {
    console.error('deleteBrandAction: Failed to delete brand', deleteError)
    throw new Error('Failed to delete brand. Please try again.')
  }

  // Get updated brand count
  const { count: brandCount } = await supabaseAdmin
    .from('brands')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', brand.group_id)

  // Update Stripe subscription quantity
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ferdy.io'
    const response = await fetch(`${baseUrl}/api/stripe/update-quantity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
      body: JSON.stringify({
        groupId: brand.group_id,
        brandCount: brandCount || 0,
      }),
    })

    if (!response.ok) {
      console.error('Failed to update Stripe subscription quantity:', await response.text())
    }
  } catch (err) {
    console.error('Error updating Stripe subscription:', err)
  }

  return true
}
