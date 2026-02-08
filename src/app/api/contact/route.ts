import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, brandUrl, message, formType } = body

    // Determine the subject based on form type
    let subject = 'New Contact Form Submission'
    if (formType === 'loom') {
      subject = 'New Personalised Loom Request'
    } else if (formType === 'training') {
      subject = 'New Training/Onboarding Request'
    } else if (formType === 'demo') {
      subject = 'New Demo Request'
    } else if (formType === 'book-call') {
      subject = 'New Multi-Brand Call Request'
    }

    await resend.emails.send({
      from: 'Ferdy <support@ferdy.io>',
      to: 'andrew@ferdy.io',
      subject,
      html: `
        <h2>${subject}</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Brand URL:</strong> ${brandUrl || 'Not provided'}</p>
        <p><strong>Message:</strong> ${message || 'No additional message'}</p>
        <hr />
        <p style="color: #666; font-size: 12px;">Form Type: ${formType} | Submitted at: ${new Date().toLocaleString()}</p>
      `,
      replyTo: email,
    })

    return NextResponse.json({
      success: true,
      message: 'Form submitted successfully'
    })

  } catch (error) {
    console.error('Error processing contact form:', error)
    return NextResponse.json(
      { success: false, message: 'Error processing form submission' },
      { status: 500 }
    )
  }
}
