'use server'

import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendBrandAdded } from '@/lib/emails/send'

const CreateBrandPayloadSchema = z.object({
  userId: z.string().uuid('User session is invalid. Please sign in again.'),
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

  const { userId, name, websiteUrl, countryCode, timezone } = parsed.data

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', userId)
    .single()

  if (profileError) {
    console.error('createBrandAction: failed to load profile for user', userId, profileError)
    throw new Error('Unable to verify your permissions. Please try again.')
  }

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw new Error('You do not have permission to create a brand.')
  }

  const { data: brand, error: rpcError } = await supabaseAdmin.rpc('rpc_create_brand_with_admin', {
    p_user_id: userId,
    p_name: name,
    p_website_url: websiteUrl ?? '',
    p_country_code: countryCode ?? '',
    p_timezone: timezone,
  })

  if (rpcError) {
    console.error('createBrandAction: RPC failed', rpcError)
    throw new Error('Creating the brand failed. Please try again in a moment.')
  }

  if (!brand?.id) {
    console.error('createBrandAction: RPC returned no brand id', brand)
    throw new Error('Could not create the brand. Please try again.')
  }

  // Get the group_id from the brand to update Stripe subscription
  const { data: brandData, error: brandFetchError } = await supabaseAdmin
    .from('brands')
    .select('group_id')
    .eq('id', brand.id)
    .single()

  let brandCount: number | null = null
  
  if (!brandFetchError && brandData?.group_id) {
    // Get current brand count for the group
    const { count } = await supabaseAdmin
      .from('brands')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', brandData.group_id)
      .eq('status', 'active')
    
    brandCount = count

    console.log(`[createBrandAction] Brand count for group ${brandData.group_id}: ${brandCount}`)

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
            groupId: brandData.group_id,
            brandCount,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`[createBrandAction] Failed to update Stripe subscription quantity:`, errorText)
        } else {
          console.log(`[createBrandAction] Successfully updated Stripe subscription quantity to ${brandCount}`)
        }
      } catch (err) {
        console.error('[createBrandAction] Error updating Stripe subscription:', err)
      }
    } else {
      console.log(`[createBrandAction] Skipping Stripe update - brandCount is ${brandCount}`)
    }

    // Send brand added email
    console.log(`[createBrandAction] Preparing to send brand added email - brandCount: ${brandCount}, group_id: ${brandData.group_id}`)
    try {
      const { data: groupData } = await supabaseAdmin
        .from('groups')
        .select('price_per_brand_cents, currency')
        .eq('id', brandData.group_id)
        .single()

      console.log(`[createBrandAction] Group data retrieved:`, groupData)

      if (groupData) {
        // Get user email from auth.users table using the userId
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId)
        console.log(`[createBrandAction] User retrieved - email: ${user?.email}`)
        
        if (user?.email) {
          console.log(`[createBrandAction] Sending brand added email to ${user.email}`)
          await sendBrandAdded({
            to: user.email,
            brandName: name,
            newBrandCount: brandCount || 0,
            newMonthlyTotal: (brandCount || 0) * groupData.price_per_brand_cents,
            currency: groupData.currency || 'usd',
          })
          console.log(`[createBrandAction] Successfully sent brand added email`)
        } else {
          console.error('[createBrandAction] No email found for user:', userId)
        }
      } else {
        console.error('[createBrandAction] No group data found for group:', brandData.group_id)
      }
    } catch (emailError) {
      console.error('[createBrandAction] Failed to send brand added email:', emailError)
      // Don't fail brand creation if email fails
    }
  }

  // Fire-and-forget: Generate AI summary via API endpoint
  // Calling the API endpoint ensures it runs in a separate serverless function
  // that won't be terminated when this server action completes
  if (websiteUrl && websiteUrl.trim()) {
    // Always use the production URL for API calls to ensure consistency
    // The API endpoint will run in the same deployment, so using the production URL is safe
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.ferdy.io'
    const apiUrl = `${baseUrl}/api/brands/${brand.id}/generate-summary`
    
    console.log(`[createBrandAction] Triggering AI summary generation for brand ${brand.id} (${brand.name})`)
    console.log(`[createBrandAction] API URL: ${apiUrl}`)
    
    // Use setTimeout to defer the fetch slightly, ensuring the server action response
    // is sent first, but the fetch still executes before the function context terminates
    // This is a workaround for serverless environments that might kill pending async ops
    setTimeout(() => {
      console.log(`[createBrandAction] Executing fetch for ${apiUrl}`)
      
      fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Use CRON_SECRET for internal auth if available
          ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
        },
      })
        .then((response) => {
          console.log(`[createBrandAction] API endpoint responded with status ${response.status} for brand ${brand.id}`)
          if (!response.ok) {
            return response.text().then(text => {
              console.error(`[createBrandAction] API endpoint returned error: ${response.status} - ${text}`)
            })
          }
          return response.json().then(data => {
            console.log(`[createBrandAction] API endpoint success response:`, data)
          }).catch(() => {
            // Ignore JSON parse errors
          })
        })
        .catch((err) => {
          // Log but don't throw - we don't want to break brand creation if API call fails
          console.error('[createBrandAction] Failed to trigger AI summary generation API (non-blocking):', err)
          console.error('[createBrandAction] Error type:', err?.constructor?.name)
          console.error('[createBrandAction] Error message:', err instanceof Error ? err.message : String(err))
        })
    }, 100) // Small delay to ensure response is sent first
    
    // Log that we've initiated the fetch (this executes immediately)
    console.log(`[createBrandAction] Scheduled fetch request (non-blocking) for ${apiUrl}`)
  } else {
    console.log(`[createBrandAction] Skipping AI summary generation - no website URL for brand ${brand.id}`)
  }

  return brand.id as string
}

