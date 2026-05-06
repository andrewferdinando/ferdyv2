import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const maxDuration = 15

const FROM_EMAIL = 'Ferdy <support@ferdy.io>'
const TO_EMAIL = 'support@ferdy.io'

type LeadInput = {
  name?: string
  email: string
  businessName?: string
  homepageUrl?: string
  source?: string
  keptItemTitles?: string[]
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export async function POST(req: NextRequest) {
  let body: LeadInput
  try {
    body = (await req.json()) as LeadInput
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const email = (body.email || '').trim()
  const name = (body.name || '').trim()
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const businessName = body.businessName?.trim() || 'Unknown business'
  const homepageUrl = body.homepageUrl?.trim() || ''
  const source = body.source?.trim() || '/demo'
  const keptItems = (body.keptItemTitles || []).filter(
    (s): s is string => typeof s === 'string'
  )

  const subject = `New /demo lead — ${businessName}`
  const html = `
    <div style="font-family: Inter, system-ui, sans-serif; line-height: 1.5; color: #111;">
      <h2 style="margin: 0 0 12px;">New scope-my-site lead</h2>
      <p style="margin: 0 0 16px;">Someone just finished the /demo flow and asked for setup help.</p>
      <table style="border-collapse: collapse; margin: 0 0 16px;">
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Name</td><td style="padding: 4px 0;">${escape(
          name || '—'
        )}</td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Email</td><td style="padding: 4px 0;"><a href="mailto:${escape(
          email
        )}">${escape(email)}</a></td></tr>
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Business</td><td style="padding: 4px 0;">${escape(
          businessName
        )}</td></tr>
        ${
          homepageUrl
            ? `<tr><td style="padding: 4px 12px 4px 0; color: #666;">URL</td><td style="padding: 4px 0;">${escape(
                homepageUrl
              )}</td></tr>`
            : ''
        }
        <tr><td style="padding: 4px 12px 4px 0; color: #666;">Source</td><td style="padding: 4px 0;">${escape(
          source
        )}</td></tr>
      </table>
      ${
        keptItems.length > 0
          ? `<p style="margin: 16px 0 4px;"><strong>Kept categories (${keptItems.length}):</strong></p>
             <ul style="margin: 0; padding-left: 20px;">${keptItems
               .map((t) => `<li>${escape(t)}</li>`)
               .join('')}</ul>`
          : ''
      }
    </div>
  `.trim()

  const text =
    `New scope-my-site lead\n\n` +
    `Name: ${name || '—'}\n` +
    `Email: ${email}\n` +
    `Business: ${businessName}\n` +
    (homepageUrl ? `URL: ${homepageUrl}\n` : '') +
    `Source: ${source}\n` +
    (keptItems.length > 0 ? `\nKept (${keptItems.length}):\n` + keptItems.map((t) => ` - ${t}`).join('\n') : '')

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // Don't 500 the user — log and accept. The lead is captured in Vercel logs.
    console.warn('[scope/lead] RESEND_API_KEY not set; lead was:', {
      name,
      email,
      businessName,
      homepageUrl,
      keptItems,
    })
    return NextResponse.json({ ok: true, delivered: false })
  }

  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      replyTo: email,
      subject,
      html,
      text,
    })
  } catch (err) {
    console.error('[scope/lead] Resend send failed:', err)
    // Still ack the user — capture is logged.
    return NextResponse.json({ ok: true, delivered: false })
  }

  return NextResponse.json({ ok: true, delivered: true })
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
