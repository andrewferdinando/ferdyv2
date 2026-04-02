import { supabaseAdmin } from '@/lib/supabase-server'
import { addContactToAudience, getAudienceId, removeContactFromAudience } from './resend'
import { isTestUserEmail } from './test-users'
import type { CustomerSyncResult } from './types'

export async function syncCustomersToResend(): Promise<CustomerSyncResult> {
  const result: CustomerSyncResult = { synced: 0, removed: 0, errors: [] }

  const customersAudienceId = getAudienceId('customers')
  const nonCustomersAudienceId = getAudienceId('non_customers')

  // 1. Get all users in active groups (customers)
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('group_memberships')
    .select('user_id, groups!inner(subscription_status)')
    .eq('groups.subscription_status', 'active')

  if (membershipError) {
    result.errors.push(`Failed to fetch group memberships: ${membershipError.message}`)
    return result
  }

  if (!memberships || memberships.length === 0) {
    return result
  }

  // Deduplicate user IDs (a user can be in multiple groups)
  const uniqueUserIds = [...new Set(memberships.map(m => m.user_id))]

  // 2. Get auth emails for these users
  const { data: authData, error: authError } = await supabaseAdmin
    .auth.admin.listUsers({ perPage: 1000 })

  if (authError) {
    result.errors.push(`Failed to fetch auth users: ${authError.message}`)
    return result
  }

  const authMap = new Map(
    authData.users.map(u => [u.id, u.email])
  )

  // 3. Get profiles for names + test user status
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('user_id, name, full_name, is_test_user')
    .in('user_id', uniqueUserIds)

  if (profileError) {
    result.errors.push(`Failed to fetch profiles: ${profileError.message}`)
    return result
  }

  const profileMap = new Map(
    (profiles || []).map(p => [p.user_id, p])
  )

  // 4. Upsert each active customer into Resend Customers audience
  for (const userId of uniqueUserIds) {
    const email = authMap.get(userId)
    if (!email) continue

    const profile = profileMap.get(userId)

    // Skip test users
    if (profile?.is_test_user || isTestUserEmail(email)) continue

    const displayName = profile?.name || profile?.full_name || ''
    const nameParts = displayName.split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    try {
      await addContactToAudience(customersAudienceId, {
        email,
        firstName,
        lastName,
      })
      result.synced++
    } catch (err: any) {
      result.errors.push(`Failed to sync ${email}: ${err.message}`)
    }
  }

  // 5. Check Non-customers table for emails that are now customers — remove them
  const customerEmails = uniqueUserIds
    .map(id => authMap.get(id))
    .filter((e): e is string => !!e)
    .filter(e => !isTestUserEmail(e))

  if (customerEmails.length > 0) {
    const { data: convertedContacts, error: contactError } = await supabaseAdmin
      .from('newsletter_contacts')
      .select('id, email, resend_contact_id')
      .in('email', customerEmails)

    if (contactError) {
      result.errors.push(`Failed to check newsletter_contacts: ${contactError.message}`)
    } else if (convertedContacts && convertedContacts.length > 0) {
      for (const contact of convertedContacts) {
        try {
          // Remove from Resend Non-customers audience
          if (contact.resend_contact_id) {
            await removeContactFromAudience(nonCustomersAudienceId, {
              id: contact.resend_contact_id,
            })
          } else {
            await removeContactFromAudience(nonCustomersAudienceId, {
              email: contact.email,
            })
          }
        } catch (err: any) {
          // Contact might not exist in Resend anymore — that's fine
          console.warn(`[newsletter/sync] Could not remove ${contact.email} from Non-customers audience: ${err.message}`)
        }

        // Delete from local table
        await supabaseAdmin
          .from('newsletter_contacts')
          .delete()
          .eq('id', contact.id)

        result.removed++
      }
    }
  }

  console.log(`[newsletter/sync] Synced ${result.synced} customers, removed ${result.removed} converted contacts, ${result.errors.length} errors`)

  return result
}
