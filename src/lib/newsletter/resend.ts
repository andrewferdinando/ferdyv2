import { Resend } from 'resend'

// Separate Resend instance for newsletter operations.
// Never import from src/lib/emails/send.ts — complete isolation.
let newsletterResendInstance: Resend | null = null

function getNewsletterResend(): Resend {
  if (!newsletterResendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables')
    }
    newsletterResendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return newsletterResendInstance
}

export function getAudienceId(type: 'customers' | 'non_customers'): string {
  const envKey = type === 'customers'
    ? 'RESEND_AUDIENCE_CUSTOMERS'
    : 'RESEND_AUDIENCE_NON_CUSTOMERS'

  const id = process.env[envKey]
  if (!id) {
    throw new Error(`${envKey} is not set in environment variables`)
  }
  return id
}

export async function createAudience(name: string) {
  const resend = getNewsletterResend()
  const { data, error } = await resend.audiences.create({ name })
  if (error) {
    throw new Error(`Failed to create audience "${name}": ${error.message}`)
  }
  return data!
}

export async function addContactToAudience(
  audienceId: string,
  contact: { email: string; firstName?: string; lastName?: string }
) {
  const resend = getNewsletterResend()
  const { data, error } = await resend.contacts.create({
    audienceId,
    email: contact.email,
    firstName: contact.firstName,
    lastName: contact.lastName,
  })
  if (error) {
    throw new Error(`Failed to add contact ${contact.email}: ${error.message}`)
  }
  return data!
}

export async function removeContactFromAudience(
  audienceId: string,
  contactIdentifier: { id?: string; email?: string }
) {
  const resend = getNewsletterResend()

  const options: { audienceId: string; id?: string; email?: string } = { audienceId }
  if (contactIdentifier.id) {
    options.id = contactIdentifier.id
  } else if (contactIdentifier.email) {
    options.email = contactIdentifier.email
  }

  const { data, error } = await resend.contacts.remove(options as any)
  if (error) {
    throw new Error(`Failed to remove contact: ${error.message}`)
  }
  return data
}

export async function listAudienceContacts(audienceId: string) {
  const resend = getNewsletterResend()
  const allContacts: any[] = []
  let hasMore = true
  let after: string | undefined

  // Paginate through all contacts
  while (hasMore) {
    const options: any = { audienceId, limit: 100 }
    if (after) options.after = after

    const { data, error } = await resend.contacts.list(options)
    if (error) {
      throw new Error(`Failed to list contacts: ${error.message}`)
    }

    if (data) {
      allContacts.push(...data.data)
      hasMore = data.has_more
      if (data.data.length > 0) {
        after = data.data[data.data.length - 1].id
      } else {
        hasMore = false
      }
    } else {
      hasMore = false
    }
  }

  return allContacts
}

export async function listAudiences() {
  const resend = getNewsletterResend()
  const { data, error } = await resend.audiences.list()
  if (error) {
    throw new Error(`Failed to list audiences: ${error.message}`)
  }
  return data
}

export { getNewsletterResend }
