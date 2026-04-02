import { getNewsletterResend } from './resend'

const FROM_EMAIL = 'Ferdy <support@ferdy.io>'

export async function sendBroadcast({
  audienceId,
  subject,
  html,
  name,
}: {
  audienceId: string
  subject: string
  html: string
  name?: string
}) {
  const resend = getNewsletterResend()

  // Step 1: Create the broadcast
  const { data: created, error: createError } = await resend.broadcasts.create({
    audienceId,
    from: FROM_EMAIL,
    subject,
    html,
    name: name || `Broadcast: ${subject}`,
  })

  if (createError) {
    throw new Error(`Failed to create broadcast: ${createError.message}`)
  }

  // Step 2: Send the broadcast
  const { data: sent, error: sendError } = await resend.broadcasts.send(created!.id)

  if (sendError) {
    throw new Error(`Broadcast created but failed to send: ${sendError.message}`)
  }

  return { broadcastId: created!.id, sendId: sent!.id }
}

export async function sendTestEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const resend = getNewsletterResend()

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `[TEST] ${subject}`,
    html,
  })

  if (error) {
    throw new Error(`Failed to send test email: ${error.message}`)
  }

  return { emailId: data!.id }
}

export async function listBroadcasts() {
  const resend = getNewsletterResend()
  const { data, error } = await resend.broadcasts.list()
  if (error) {
    throw new Error(`Failed to list broadcasts: ${error.message}`)
  }
  return data
}
