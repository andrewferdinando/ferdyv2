import { NextRequest, NextResponse } from 'next/server'

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

    // Format the email content
    const emailContent = `
New ${subject} from Ferdy Website

Name: ${name}
Email: ${email}
Brand URL: ${brandUrl || 'Not provided'}
Message: ${message || 'No additional message'}

Form Type: ${formType}
Submitted at: ${new Date().toLocaleString()}
    `.trim()

    // TODO: Integrate with your email service (e.g., SendGrid, Resend, etc.)
    // For now, we'll log it and return success
    // In production, you would send an actual email to andrew@ferdy.io
    
    console.log('Contact form submission:', {
      to: 'andrew@ferdy.io',
      subject,
      content: emailContent,
      data: body
    })

    // Return success response
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
