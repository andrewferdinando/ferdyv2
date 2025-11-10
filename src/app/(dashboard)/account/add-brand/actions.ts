'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'

const CreateBrandPayloadSchema = z.object({
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

  const cookieStore = cookies()
  const accessToken = cookieStore.get('sb-access-token')?.value

  if (!accessToken) {
    throw new Error('You must be signed in to create a brand.')
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken)

  if (userError || !user) {
    console.error('createBrandAction: failed to resolve user from access token', userError)
    throw new Error('Unable to verify your account. Please sign in again.')
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profileError) {
    console.error('createBrandAction: failed to load profile', profileError)
    throw new Error('Unable to verify your permissions. Please try again.')
  }

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    throw new Error('You do not have permission to create a brand.')
  }

  const { data: brand, error: rpcError } = await supabaseAdmin.rpc('rpc_create_brand_with_admin', {
    p_user_id: user.id,
    p_name: parsed.data.name,
    p_website_url: parsed.data.websiteUrl ?? '',
    p_country_code: parsed.data.countryCode ?? '',
    p_timezone: parsed.data.timezone,
  })

  if (rpcError) {
    console.error('createBrandAction: RPC failed', rpcError)
    throw new Error('Creating the brand failed. Please try again in a moment.')
  }

  if (!brand?.id) {
    console.error('createBrandAction: RPC returned no brand id', brand)
    throw new Error('Could not create the brand. Please try again.')
  }

  return brand.id as string
}


