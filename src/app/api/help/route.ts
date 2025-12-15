import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import { Resend } from 'resend'
import { HelpRequest } from '@/emails/HelpRequest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

interface HelpRequestBody {
  userName: string
  userEmail: string
  subject: string
  category: string
  message: string
  brandName?: string
  brandId?: string
  pageUrl?: string
}

/**
 * POST /api/help
 * 
 * Sends a help request email to support@ferdy.io
 * 
 * Future extension points:
 * - Add database storage for ticket tracking
 * - Route to different emails based on category (e.g., billing@ferdy.io)
 * - Integrate with help desk software (Zendesk, Intercom, etc.)
 * - Add auto-response email to user
 * - Add rate limiting per user
 */
export async function POST(request: NextRequest) {
  try {
    const body: HelpRequestBody = await request.json()

    // Validate required fields
    if (!body.userName || !body.userEmail || !body.subject || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.userEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'Pacific/Auckland',
      dateStyle: 'full',
      timeStyle: 'long',
    })

    // Render email template
    const emailHtml = await render(
      HelpRequest({
        userName: body.userName,
        userEmail: body.userEmail,
        subject: body.subject,
        category: body.category || 'Other',
        message: body.message,
        brandName: body.brandName,
        brandId: body.brandId,
        pageUrl: body.pageUrl,
        timestamp,
      })
    )

    // Send email to support
    const { data, error } = await resend.emails.send({
      from: 'Ferdy Support <no-reply@ferdy.io>',
      to: 'support@ferdy.io',
      replyTo: body.userEmail, // Allow direct reply to user
      subject: `Help Request: ${body.subject}`,
      html: emailHtml,
    })

    if (error) {
      console.error('[help/route] Error sending email:', error)
      return NextResponse.json(
        { error: 'Failed to send help request' },
        { status: 500 }
      )
    }

    console.log('[help/route] Help request sent successfully:', {
      emailId: data?.id,
      from: body.userEmail,
      subject: body.subject,
      category: body.category,
    })

    return NextResponse.json({
      success: true,
      message: 'Help request sent successfully',
    })
  } catch (error) {
    console.error('[help/route] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
