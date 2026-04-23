import { render } from '@react-email/render'
import { Resend } from 'resend'
import { PartnerRegistrationConfirmation } from '@/emails/PartnerRegistrationConfirmation'
import { PartnerRegistrationNotification } from '@/emails/PartnerRegistrationNotification'
import { PartnerBCTI } from '@/emails/PartnerBCTI'

const FROM_EMAIL = 'Ferdy <support@ferdy.io>'
const NOTIFICATION_EMAIL = 'andrew@ferdy.io'

let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables')
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

export interface PartnerRegistrationConfirmationData {
  to: string
  fullName: string
  tradingName: string
}

export async function sendPartnerRegistrationConfirmation(
  data: PartnerRegistrationConfirmationData,
) {
  const html = await render(
    PartnerRegistrationConfirmation({
      fullName: data.fullName,
      tradingName: data.tradingName,
    }),
  )

  return getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: 'Welcome to the Ferdy Partner Programme',
    html,
  })
}

export interface PartnerRegistrationNotificationData {
  fullName: string
  email: string
  phone?: string | null
  country: string
  tradingName: string
  entityType: string
  companyNumber?: string | null
  businessAddress: string
  gstRegistered: boolean
  gstNumber?: string | null
  paymentMethod: string
  partnerId: string
}

export async function sendPartnerRegistrationNotification(
  data: PartnerRegistrationNotificationData,
) {
  const html = await render(
    PartnerRegistrationNotification({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      country: data.country,
      tradingName: data.tradingName,
      entityType: data.entityType,
      companyNumber: data.companyNumber,
      businessAddress: data.businessAddress,
      gstRegistered: data.gstRegistered,
      gstNumber: data.gstNumber,
      paymentMethod: data.paymentMethod,
      partnerId: data.partnerId,
    }),
  )

  return getResend().emails.send({
    from: FROM_EMAIL,
    to: NOTIFICATION_EMAIL,
    subject: `New partner registration: ${data.fullName} (${data.tradingName})`,
    html,
  })
}

export interface PartnerBCTIEmailData {
  to: string
  fullName: string
  bctiNumber: string
  periodLabel: string
  totalCents: number
  gstCents: number
  currency: string
  pdfBase64: string
  pdfFilename: string
}

export async function sendPartnerBCTI(data: PartnerBCTIEmailData) {
  const firstName = data.fullName.trim().split(/\s+/)[0] || 'there'

  const html = await render(
    PartnerBCTI({
      firstName,
      bctiNumber: data.bctiNumber,
      periodLabel: data.periodLabel,
      totalCents: data.totalCents,
      gstCents: data.gstCents,
      currency: data.currency,
    }),
  )

  const formattedTotal = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: data.currency.toUpperCase(),
  }).format(data.totalCents / 100)

  return getResend().emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `Your Ferdy partner commission — ${data.periodLabel} (${formattedTotal})`,
    html,
    attachments: [
      {
        filename: data.pdfFilename,
        content: data.pdfBase64,
      },
    ],
  })
}
