# Email Notification Triggers

This document describes when and how each email notification is triggered in the Ferdy application.

## ✅ Implemented Triggers

### 1. Invoice Paid
**Location:** `/src/app/api/stripe/webhook/route.ts`
**Trigger:** Stripe webhook `invoice.paid`
**When:** After a successful payment is processed
**Data:** Amount, billing period, brand count, invoice URL
**Status:** ✅ Fully implemented and tested

### 2. Brand Added
**Location:** `/src/app/(dashboard)/account/add-brand/actions.ts`
**Trigger:** After `createBrandAction` successfully creates a brand
**When:** User creates a new brand in the UI
**Data:** Brand name, new brand count, new monthly total
**Status:** ✅ Fully implemented and tested

### 3. Brand Deleted
**Location:** `/src/app/api/brands/remove/route.ts`
**Trigger:** After brand is soft-deleted and Stripe subscription is updated
**When:** Admin removes a brand from the billing page
**Data:** Brand name, remaining brand count, new monthly total, billing period end
**Status:** ✅ Fully implemented and tested

### 4. New User Invite
**Location:** `/src/app/(dashboard)/brands/[brandId]/account/team/actions.ts`
**Trigger:** When an admin invites someone who doesn't have a Ferdy account
**When:** Admin adds a new team member via the team management page
**Data:** Brand name, inviter name, invite link (7-day expiry)
**Status:** ✅ Fully implemented
**Implementation:** Uses `auth.admin.generateLink()` with type 'invite' and sends custom branded email via Resend

### 5. Existing User Invite
**Location:** `/src/app/(dashboard)/brands/[brandId]/account/team/actions.ts`
**Trigger:** When an admin invites an existing Ferdy user to a brand
**When:** Admin adds an existing user via the team management page
**Data:** Brand name, inviter name, magic link (24-hour expiry)
**Status:** ✅ Fully implemented
**Implementation:** Uses `auth.admin.generateLink()` with type 'magiclink' and sends custom branded email via Resend

### 6. Forgot Password
**Location:** `/src/app/api/auth/reset-password/route.ts`
**Trigger:** User requests password reset
**When:** User submits forgot password form
**Data:** Password reset link
**Status:** ✅ Fully implemented
**Implementation:** 
- POST endpoint accepts email address
- Generates password reset link using `auth.admin.generateLink()` with type 'recovery'
- Sends custom branded email via Resend
- Returns generic success message to prevent email enumeration attacks

**Usage:**
```typescript
// Frontend should POST to /api/auth/reset-password
const response = await fetch('/api/auth/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com' }),
})
```

---

### 7. Monthly Drafts Ready for Approval
**Location:** `/src/app/api/drafts/push/route.ts`
**Trigger:** After monthly drafts are created and copy generation completes
**When:** Drafts are pushed either manually (via button) or automatically (on 15th of month)
**Data:** Brand name, draft count, approval link, current month
**Status:** ✅ Fully implemented
**Recipients:** All brand admins and editors (both roles can approve drafts)

---

## 📋 To Be Implemented

### 8. Post Published
**Suggested Location:** `/src/server/publishing/publishJob.ts`
**Trigger:** After a post is successfully published to a social platform
**Status:** ⏳ Pending - Template ready, needs integration
**Implementation:**
```typescript
import { sendPostPublished } from '@/lib/emails/send'
import { supabaseAdmin } from '@/lib/supabase-server'

// Add this after successful publish (line 157-163 in publishJob.ts)
export async function notifyPostPublished(
  draft: DraftRow,
  job: PostJobRow,
  publishResult: { externalId: string; externalUrl: string | null }
) {
  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('name, group_id')
    .eq('id', draft.brand_id)
    .eq('status', 'active')
    .single()
  
  if (!brand) return
  
  // Get admin emails for the brand
  const { data: memberships } = await supabaseAdmin
    .from('brand_memberships')
    .select('user_id, profiles(user_id)')
    .eq('brand_id', draft.brand_id)
    .eq('role', 'admin')
    .eq('status', 'active')

  if (!memberships || memberships.length === 0) return

  // Get user emails from auth
  const adminEmails: string[] = []
  for (const membership of memberships) {
    if (membership.profiles?.user_id) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(membership.profiles.user_id)
      if (user?.email) {
        adminEmails.push(user.email)
      }
    }
  }
  
  const publishedAt = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  
  for (const email of adminEmails) {
    await sendPostPublished({
      to: email,
      brandName: brand.name,
      publishedAt,
      platform: job.channel,
      postLink: publishResult.externalUrl || `${process.env.NEXT_PUBLIC_APP_URL}/brands/${draft.brand_id}/published`,
      postPreview: draft.copy?.substring(0, 200) || '',
    })
  }
}
```

### 9. Social Connection Disconnected
**Suggested Location:** Create `/src/lib/cron/check-connections.ts`
**Trigger:** Cron job health check detects invalid tokens
**Status:** ⏳ Pending - Requires connection health check system
**Implementation:**
```typescript
import { sendSocialConnectionDisconnected } from '@/lib/emails/send'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function notifyConnectionLost(socialAccountId: string) {
  const { data: socialAccount } = await supabaseAdmin
    .from('social_accounts')
    .select('provider, brand_id, brands(name, group_id, status)')
    .eq('id', socialAccountId)
    .single()
  
  if (!socialAccount || !socialAccount.brands || socialAccount.brands.status !== 'active') return
  
  // Get admin emails for the brand
  const { data: memberships } = await supabaseAdmin
    .from('brand_memberships')
    .select('user_id, profiles(user_id)')
    .eq('brand_id', socialAccount.brand_id)
    .eq('role', 'admin')
    .eq('status', 'active')

  if (!memberships || memberships.length === 0) return

  // Get user emails from auth
  const adminEmails: string[] = []
  for (const membership of memberships) {
    if (membership.profiles?.user_id) {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(membership.profiles.user_id)
      if (user?.email) {
        adminEmails.push(user.email)
      }
    }
  }
  
  for (const email of adminEmails) {
    await sendSocialConnectionDisconnected({
      to: email,
      brandName: socialAccount.brands.name,
      platform: socialAccount.provider,
      reconnectLink: `${process.env.NEXT_PUBLIC_APP_URL}/brands/${socialAccount.brand_id}/settings/integrations`,
    })
  }
}
```

---

## Environment Variables Required

Make sure these are set in your Vercel environment:

```env
RESEND_API_KEY=re_xxxxx
NEXT_PUBLIC_APP_URL=https://www.ferdy.io
APP_URL=https://www.ferdy.io
```

---

## Implementation Summary

**Completed: 7/9 email notifications**

✅ **Critical User Flows (All Implemented):**
- Invoice Paid - Billing confirmation
- Brand Added - Brand management
- Brand Deleted - Brand management
- New User Invite - Team onboarding
- Existing User Invite - Team onboarding
- Forgot Password - Account recovery

✅ **Content Workflow:**
- Monthly Drafts Ready - Notifies admins/editors when drafts are ready for approval

⏳ **Nice-to-Have Features (Pending):**
- Post Published - Requires integration into publishing system
- Social Connection Disconnected - Requires connection health monitoring

---

## Testing Emails Locally

To test email templates locally, you can use the React Email preview:

```bash
pnpm add -D @react-email/preview
pnpm email dev
```

Or create a test endpoint:

```typescript
// /src/app/api/test-email/route.ts
import { sendBrandAdded } from '@/lib/emails/send'

export async function GET() {
  await sendBrandAdded({
    to: 'test@example.com',
    brandName: 'Test Brand',
    newBrandCount: 2,
    newMonthlyTotal: 17200,
    currency: 'usd',
  })
  
  return Response.json({ success: true })
}
```

---

## Notes

- All emails are sent from `support@ferdy.io` with Ferdy branding
- Email templates use React Email components for consistent styling
- Invitation emails use Supabase's `auth.admin.generateLink()` for secure, time-limited links
- Password reset endpoint includes anti-enumeration protection (always returns success)
- All email sending is non-blocking and logged for debugging
