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

### 7. Weekly Approval Summary
**Location:** `/src/app/api/emails/weekly-approval-summary/route.ts`
**Trigger:** Every Monday at 11am local time (brand's timezone)
**When:** Cron job runs hourly and checks if it's Monday 11am in each brand's timezone
**Data:** Brand name, approved count, needs approval count, approval link
**Status:** ✅ Fully implemented
**Recipients:** All brand admins and editors
**Behavior:**
- Shows how many posts are approved within the 30-day window
- Shows how many posts need approval
- Includes approval progress percentage
- Only sent on Mondays at 11am in the brand's local timezone

### 8. Low Approved Drafts Reminder
**Location:** `/src/app/api/emails/low-approved-reminder/route.ts`
**Trigger:** Daily check for brands with less than 7 days of approved drafts
**When:** Cron job runs daily at 9am UTC
**Data:** Brand name, approved days count, approval link
**Status:** ✅ Fully implemented
**Recipients:** All brand admins and editors
**Behavior:**
- Checks if brand has less than 7 days of approved drafts in the schedule
- Sends reminder email if threshold is not met
- Calculates approved days by counting unique days with approved drafts

### 9. Post Published
**Location:** `/src/server/publishing/publishJob.ts` (batched notification function)
**Trigger:** After all jobs for a draft are successfully published
**When:** Post is published either manually (via "Publish Now") or automatically (via scheduled cron)
**Data:** Brand name, channels (array), published time, post link, post preview
**Status:** ✅ Fully implemented
**Recipients:** All brand admins and editors
**Behavior:** 
- Sends **one email per draft** (not per channel) to reduce email overload
- Lists all channels the post was published to in a single email
- If post was published to multiple channels (e.g., Instagram Feed, Instagram Story, Facebook), all channels are listed in one email
- Each channel can have its own "View post" link if available

### 10. Social Connection Disconnected
**Location:** `/src/server/publishing/publishJob.ts`
**Trigger:** Reactive detection during publishing when auth errors occur
**When:** Token refresh fails OR publishing encounters authentication errors
**Data:** Brand name, platform, reconnect link
**Status:** ✅ Fully implemented
**Recipients:** All brand admins and editors

**How it works:**
1. **Automatic Token Refresh:** Before publishing, tokens are checked and refreshed if expiring within 7 days
2. **Error Detection:** Auth failures are detected using pattern matching (invalid_token, expired_token, error codes 190/102/463, etc.)
3. **Status Update:** Social account status is set to `'disconnected'`
4. **Email Alerts:** All brand admins/editors receive email with reconnect instructions

**Implementation Files:**
- `/src/server/social/tokenRefresh.ts` - Token refresh logic for Meta and LinkedIn
- `/src/server/publishing/publishJob.ts` - Integration and disconnection detection
- `/src/lib/emails/send.ts` - Email notification function
- `/emails/SocialConnectionDisconnected.tsx` - Email template

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

**Completed: 10/10 email notifications ✅**

✅ **Critical User Flows (All Implemented):**
- Invoice Paid - Billing confirmation
- Brand Added - Brand management
- Brand Deleted - Brand management
- New User Invite - Team onboarding
- Existing User Invite - Team onboarding
- Forgot Password - Account recovery

✅ **Content Workflow (All Implemented):**
- Weekly Approval Summary - Weekly Monday 11am summary of approved vs needs approval posts
- Low Approved Drafts Reminder - Daily reminder if less than 7 days of approved drafts
- Post Published - Notifies admins/editors when a post is successfully published

✅ **Social Platform Management (All Implemented):**
- Social Connection Disconnected - Reactive detection with automatic token refresh

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
- **Monthly Drafts Ready email has been removed** (replaced by Weekly Approval Summary and Low Approved Drafts Reminder) to align with the rolling 30-day draft generation window
