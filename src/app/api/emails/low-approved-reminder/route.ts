import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendLowApprovedDraftsReminder } from '@/lib/emails/send'

/**
 * Low Approved Drafts Reminder Email
 * 
 * Sends daily if a brand has less than 7 days of approved drafts in the schedule
 * 
 * This endpoint should be called by a daily cron job
 */
export async function POST() {
  try {
    const now = new Date()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.ferdy.io'

    // Get all active brands
    const { data: brands, error: brandsError } = await supabaseAdmin
      .from('brands')
      .select('id, name, status')
      .eq('status', 'active')

    if (brandsError) {
      console.error('[low-approved-reminder] Error fetching brands:', brandsError)
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
    }

    if (!brands || brands.length === 0) {
      return NextResponse.json({ message: 'No active brands found' })
    }

    let emailsSent = 0
    let brandsWithLowApproved = 0

    for (const brand of brands) {
      try {
        // Calculate 7 days from now
        const sevenDaysFromNow = new Date(now)
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

        // Query approved drafts within the next 7 days
        const { data: approvedDrafts, error: draftsError } = await supabaseAdmin
          .from('drafts')
          .select('scheduled_for')
          .eq('brand_id', brand.id)
          .eq('approved', true)
          .gte('scheduled_for', now.toISOString())
          .lte('scheduled_for', sevenDaysFromNow.toISOString())
          .in('status', ['draft', 'scheduled', 'partially_published'])

        if (draftsError) {
          console.error(`[low-approved-reminder] Error fetching drafts for brand ${brand.id}:`, draftsError)
          continue
        }

        // Calculate how many days of approved content we have
        let approvedDaysCount = 0
        
        if (approvedDrafts && approvedDrafts.length > 0) {
          // Group by day and count unique days
          const uniqueDays = new Set(
            approvedDrafts.map(d => {
              const date = new Date(d.scheduled_for)
              return date.toISOString().split('T')[0] // Get YYYY-MM-DD
            })
          )
          approvedDaysCount = uniqueDays.size
        }

        if (approvedDaysCount < 7) {
          brandsWithLowApproved++

          // Get admin and editor emails for the brand
          const { data: memberships, error: membershipsError } = await supabaseAdmin
            .from('brand_memberships')
            .select('user_id, role')
            .eq('brand_id', brand.id)
            .in('role', ['admin', 'editor'])
            .eq('status', 'active')

          if (membershipsError || !memberships || memberships.length === 0) {
            console.error(`[low-approved-reminder] No active admins/editors found for brand ${brand.id}`)
            continue
          }

          // Get user emails from auth
          const adminEmails: string[] = []
          for (const membership of memberships) {
            try {
              const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(membership.user_id)
              if (userError || !user?.email) {
                continue
              }
              adminEmails.push(user.email)
            } catch (err) {
              console.error(`[low-approved-reminder] Error fetching user ${membership.user_id}:`, err)
            }
          }

          if (adminEmails.length === 0) {
            continue
          }

          // Deduplicate email addresses
          const uniqueEmails = [...new Set(adminEmails)]
          const approvalLink = `${appUrl}/brands/${brand.id}/schedule?tab=drafts`

          // Send email to each unique admin/editor
          for (const email of uniqueEmails) {
            try {
              await sendLowApprovedDraftsReminder({
                to: email,
                brandName: brand.name,
                approvedDaysCount,
                approvalLink,
              })
              emailsSent++
              console.log(`[low-approved-reminder] Email sent to ${email} for brand ${brand.name} (${approvedDaysCount} days approved)`)
            } catch (err) {
              console.error(`[low-approved-reminder] Failed to send email to ${email}:`, err)
            }
          }
        }
      } catch (err) {
        console.error(`[low-approved-reminder] Error processing brand ${brand.id}:`, err)
      }
    }

    return NextResponse.json({
      message: 'Low approved drafts reminder emails processed',
      brandsWithLowApproved,
      emailsSent,
    })
  } catch (error) {
    console.error('[low-approved-reminder] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Also support GET for Vercel cron
export async function GET() {
  return POST()
}

