import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { sendWeeklyApprovalSummary } from '@/lib/emails/send'

/**
 * Weekly Approval Summary Email
 * 
 * Sends every Monday at 11am local time (brand's timezone)
 * Shows how many posts are approved vs need approval in the 30-day window
 * 
 * This endpoint should be called by a cron job that runs frequently (e.g., hourly)
 * and checks if it's Monday 11am in each brand's timezone
 */
export async function POST() {
  try {
    const now = new Date()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://www.ferdy.io'

    // Get all active brands
    const { data: brands, error: brandsError } = await supabaseAdmin
      .from('brands')
      .select('id, name, timezone, status')
      .eq('status', 'active')

    if (brandsError) {
      console.error('[weekly-approval-summary] Error fetching brands:', brandsError)
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
    }

    if (!brands || brands.length === 0) {
      return NextResponse.json({ message: 'No active brands found' })
    }

    let emailsSent = 0
    let brandsProcessed = 0

    for (const brand of brands) {
      try {
        // Check if it's Monday 11am in the brand's timezone
        const brandTime = new Date(now.toLocaleString('en-US', { timeZone: brand.timezone || 'UTC' }))
        const isMonday = brandTime.getDay() === 1 // 0 = Sunday, 1 = Monday
        const is11am = brandTime.getHours() === 11

        if (!isMonday || !is11am) {
          continue // Skip if not Monday 11am in brand's timezone
        }

        brandsProcessed++

        // Calculate 30-day window from now
        const windowStart = new Date(now)
        const windowEnd = new Date(now)
        windowEnd.setDate(windowEnd.getDate() + 30)

        // Query drafts within the 30-day window
        const { data: drafts, error: draftsError } = await supabaseAdmin
          .from('drafts')
          .select('id, approved, scheduled_for')
          .eq('brand_id', brand.id)
          .gte('scheduled_for', windowStart.toISOString())
          .lte('scheduled_for', windowEnd.toISOString())
          .in('status', ['draft', 'scheduled', 'partially_published'])

        if (draftsError) {
          console.error(`[weekly-approval-summary] Error fetching drafts for brand ${brand.id}:`, draftsError)
          continue
        }

        // Count approved vs needs approval
        const approvedCount = drafts?.filter(d => d.approved === true).length || 0
        const needsApprovalCount = drafts?.filter(d => d.approved === false).length || 0

        // Get admin and editor emails for the brand
        const { data: memberships, error: membershipsError } = await supabaseAdmin
          .from('brand_memberships')
          .select('user_id, role')
          .eq('brand_id', brand.id)
          .in('role', ['admin', 'editor'])
          .eq('status', 'active')

        if (membershipsError || !memberships || memberships.length === 0) {
          console.error(`[weekly-approval-summary] No active admins/editors found for brand ${brand.id}`)
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
            console.error(`[weekly-approval-summary] Error fetching user ${membership.user_id}:`, err)
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
            await sendWeeklyApprovalSummary({
              to: email,
              brandName: brand.name,
              approvedCount,
              needsApprovalCount,
              approvalLink,
            })
            emailsSent++
            console.log(`[weekly-approval-summary] Email sent to ${email} for brand ${brand.name}`)
          } catch (err) {
            console.error(`[weekly-approval-summary] Failed to send email to ${email}:`, err)
          }
        }
      } catch (err) {
        console.error(`[weekly-approval-summary] Error processing brand ${brand.id}:`, err)
      }
    }

    return NextResponse.json({
      message: 'Weekly approval summary emails processed',
      brandsProcessed,
      emailsSent,
    })
  } catch (error) {
    console.error('[weekly-approval-summary] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

