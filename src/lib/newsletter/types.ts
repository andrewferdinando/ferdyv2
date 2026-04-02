export type ContactType = 'Prospect' | 'Referrer' | 'Friend'

export interface NewsletterContact {
  id: string
  first_name: string
  last_name: string
  email: string
  contact_type: ContactType
  resend_contact_id: string | null
  created_at: string
}

export interface CustomerSyncResult {
  synced: number
  removed: number
  errors: string[]
}
