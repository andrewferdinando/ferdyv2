import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendForgotPassword } from '@/lib/emails/send'
import { z } from 'zod'

const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = ResetPasswordSchema.parse(body)
    const normalizedEmail = email.trim().toLowerCase()

    console.log(`[reset-password] Password reset requested for ${normalizedEmail}`)

    // Check if user exists
    const { data: list } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = list?.users?.some(
      (user) => user.email?.toLowerCase() === normalizedEmail,
    )

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (userExists) {
      // Generate password reset link
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
        },
      })

      if (error || !data?.properties?.action_link) {
        console.error('[reset-password] Error generating reset link:', error)
        // Still return success to prevent enumeration
        return NextResponse.json({ 
          success: true, 
          message: 'If an account exists with that email, you will receive a password reset link.' 
        })
      }

      // Send custom branded email via Resend
      try {
        await sendForgotPassword({
          to: normalizedEmail,
          resetLink: data.properties.action_link,
        })
        console.log(`[reset-password] Sent password reset email to ${normalizedEmail}`)
      } catch (emailError) {
        console.error('[reset-password] Failed to send password reset email:', emailError)
        // Don't expose email sending errors to prevent enumeration
      }
    } else {
      console.log(`[reset-password] User not found for ${normalizedEmail}, no email sent`)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'If an account exists with that email, you will receive a password reset link.' 
    })

  } catch (error) {
    console.error('[reset-password] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || 'Invalid email address' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
