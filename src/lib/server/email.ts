'use server'

import { supabaseAdmin } from '@/lib/supabase-server'

export async function sendMagicLinkEmail(email: string, actionLink: string) {
  // Supabase will send the email for us when using signInWithOtp.
  const { error } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: actionLink,
    },
  })

  if (error) {
    console.error('sendMagicLinkEmail error', error)
    throw error
  }
}


