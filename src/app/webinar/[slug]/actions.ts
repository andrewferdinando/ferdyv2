'use server'

import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendWebinarConfirmation } from '@/lib/emails/webinar'

const RegisterSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  email: z.string().trim().email('Please enter a valid email address'),
  webinarSlug: z.string().min(1),
  webinarName: z.string().min(1),
  niche: z.string().min(1),
  location: z.string().min(1),
})

export interface RegisterResult {
  success: boolean
  error?: string
}

export async function registerForWebinar(
  formData: FormData
): Promise<RegisterResult> {
  const raw = {
    firstName: formData.get('firstName'),
    email: formData.get('email'),
    webinarSlug: formData.get('webinar_slug'),
    webinarName: formData.get('webinar_name'),
    niche: formData.get('niche'),
    location: formData.get('location'),
  }

  const parsed = RegisterSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message }
  }

  const { firstName, email, webinarSlug, webinarName, niche, location } =
    parsed.data

  // Validate slug exists in DB
  const { data: webinar } = await supabaseAdmin
    .from('webinars')
    .select('slug, date_label, datetime, duration_minutes, zoom_url')
    .eq('slug', webinarSlug)
    .eq('status', 'active')
    .single()

  if (!webinar) {
    return { success: false, error: 'Invalid workshop.' }
  }

  // Save to Supabase
  const { error: dbError } = await supabaseAdmin
    .from('webinar_registrations')
    .upsert(
      {
        first_name: firstName,
        email: email.toLowerCase(),
        webinar_slug: webinarSlug,
        webinar_name: webinarName,
        niche,
        location,
      },
      { onConflict: 'email,webinar_slug' }
    )

  if (dbError) {
    console.error('Webinar registration DB error:', dbError)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }

  // Send confirmation email (fire-and-forget — don't block registration on email delivery)
  sendWebinarConfirmation({
    to: email.toLowerCase(),
    firstName,
    webinarName,
    webinarDate: webinar.date_label,
    webinarSlug,
    datetime: webinar.datetime,
    duration_minutes: webinar.duration_minutes,
    zoom_url: webinar.zoom_url,
  }).catch((err) => {
    console.error('Webinar confirmation email failed:', err)
  })

  return { success: true }
}
