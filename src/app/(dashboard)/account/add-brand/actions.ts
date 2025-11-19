'use server'

import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'

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

  // Fire-and-forget: Generate AI summary via API endpoint
  // Calling the API endpoint ensures it runs in a separate serverless function
  // that won't be terminated when this server action completes
  if (websiteUrl && websiteUrl.trim()) {
    // Construct the API URL
    // Use VERCEL_URL in production, or NEXT_PUBLIC_APP_URL, or fallback to localhost
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    
    const apiUrl = `${baseUrl}/api/brands/${brand.id}/generate-summary`
    
    console.log(`[createBrandAction] Triggering AI summary generation for brand ${brand.id} (${brand.name}) via ${apiUrl}`)
    
    // Call the API endpoint - fire and forget
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use CRON_SECRET for internal auth if available
        ...(process.env.CRON_SECRET ? { Authorization: `Bearer ${process.env.CRON_SECRET}` } : {}),
      },
    }).catch((err) => {
      // Log but don't throw - we don't want to break brand creation if API call fails
      console.error('[createBrandAction] Failed to trigger AI summary generation API (non-blocking):', err)
    })
  } else {
    console.log(`[createBrandAction] Skipping AI summary generation - no website URL for brand ${brand.id}`)
  }

  return brand.id as string
}

