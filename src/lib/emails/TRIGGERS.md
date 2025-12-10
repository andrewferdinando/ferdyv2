# Email Notification Triggers

This document describes when and how each email notification is triggered in the Ferdy application.

## ✅ Implemented Triggers

### 1. Invoice Paid
**Location:** `/src/app/api/stripe/webhook/route.ts`
**Trigger:** Stripe webhook `invoice.paid`
**When:** After a successful payment is processed
**Data:** Amount, billing period, brand count, invoice URL

### 2. Brand Added
**Location:** `/src/app/(dashboard)/account/add-brand/actions.ts`
**Trigger:** After `createBrandAction` successfully creates a brand
**When:** User creates a new brand in the UI
**Data:** Brand name, new brand count, new monthly total

### 3. Brand Deleted
**Location:** `/src/app/api/brands/remove/route.ts`
**Trigger:** After brand is soft-deleted and Stripe subscription is updated
**When:** Admin removes a brand from the billing page
**Data:** Brand name, remaining brand count, new monthly total, billing period end

---

## 📋 To Be Implemented

### 4. New User Invite
**Suggested Location:** Create `/src/lib/emails/triggers/invites.ts`
**Trigger:** When an admin adds a brand member who doesn't have a Ferdy account
**Implementation:**
```typescript
import { sendNewUserInvite } from '@/lib/emails/send'

export async function inviteNewUser(data: {
  email: string
  brandName: string
  inviterName: string
  brandId: string
}) {
  // Generate invite link (7-day expiry)
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${generateInviteToken()}`
  
  await sendNewUserInvite({
    to: data.email,
    brandName: data.brandName,
    inviterName: data.inviterName,
    inviteLink,
  })
}
```

### 5. Existing User Invite (Magic Link)
**Suggested Location:** `/src/lib/emails/triggers/invites.ts`
**Trigger:** When an admin adds an existing Ferdy user to a new brand
**Implementation:**
```typescript
import { sendExistingUserInvite } from '@/lib/emails/send'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function inviteExistingUser(data: {
  userId: string
  brandName: string
  inviterName: string
  brandId: string
}) {
  // Generate magic link (24-hour expiry)
  const { data: magicLinkData } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: data.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/brands/${data.brandId}`,
    },
  })
  
  if (magicLinkData?.properties?.action_link) {
    await sendExistingUserInvite({
      to: data.email,
      brandName: data.brandName,
      inviterName: data.inviterName,
      magicLink: magicLinkData.properties.action_link,
    })
  }
}
```

### 6. Forgot Password
**Suggested Location:** Supabase auth flow or `/src/app/api/auth/reset-password/route.ts`
**Trigger:** User requests password reset
**Implementation:**
```typescript
import { sendForgotPassword } from '@/lib/emails/send'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function sendPasswordReset(email: string) {
  const { data } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    },
  })
  
  if (data?.properties?.action_link) {
    await sendForgotPassword({
      to: email,
      resetLink: data.properties.action_link,
    })
  }
}
```

### 7. Monthly Drafts Ready for Approval
**Suggested Location:** Create `/src/lib/cron/monthly-drafts.ts`
**Trigger:** Cron job after monthly draft generation completes
**Implementation:**
```typescript
import { sendMonthlyDraftsReady } from '@/lib/emails/send'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function notifyDraftsReady(brandId: string) {
  // Get brand details
  const { data: brand } = await supabaseAdmin
    .from('brands')
    .select('name, group_id')
    .eq('id', brandId)
    .single()
  
  if (!brand) return
  
  // Count drafts
  const { count: draftCount } = await supabaseAdmin
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .eq('status', 'draft')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  
  // Get admin emails for the brand
  const { data: admins } = await supabaseAdmin
    .from('brand_memberships')
    .select('user_id, profiles(email)')
    .eq('brand_id', brandId)
    .eq('role', 'admin')
  
  const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  
  for (const admin of admins || []) {
    if (admin.profiles?.email) {
      await sendMonthlyDraftsReady({
        to: admin.profiles.email,
        brandName: brand.name,
        draftCount: draftCount || 0,
        approvalLink: `${process.env.NEXT_PUBLIC_APP_URL}/brands/${brandId}/drafts`,
        month,
      })
    }
  }
}
```

### 8. Post Published
**Suggested Location:** Create `/src/lib/cron/publish-posts.ts`
**Trigger:** Cron job after a scheduled post is published
**Implementation:**
```typescript
import { sendPostPublished } from '@/lib/emails/send'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function notifyPostPublished(postId: string) {
  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('brand_id, platform, content, published_at, brands(name, group_id)')
    .eq('id', postId)
    .single()
  
  if (!post || !post.brands) return
  
  // Get admin emails for the brand
  const { data: admins } = await supabaseAdmin
    .from('brand_memberships')
    .select('user_id, profiles(email)')
    .eq('brand_id', post.brand_id)
    .eq('role', 'admin')
  
  const publishedAt = new Date(post.published_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  
  for (const admin of admins || []) {
    if (admin.profiles?.email) {
      await sendPostPublished({
        to: admin.profiles.email,
        brandName: post.brands.name,
        publishedAt,
        platform: post.platform,
        postLink: `${process.env.NEXT_PUBLIC_APP_URL}/brands/${post.brand_id}/posts/${postId}`,
        postPreview: post.content?.substring(0, 200),
      })
    }
  }
}
```

### 9. Social Connection Disconnected
**Suggested Location:** Create `/src/lib/cron/check-connections.ts`
**Trigger:** Cron job health check detects invalid tokens
**Implementation:**
```typescript
import { sendSocialConnectionDisconnected } from '@/lib/emails/send'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function notifyConnectionLost(integrationId: string) {
  const { data: integration } = await supabaseAdmin
    .from('integrations')
    .select('provider, brand_id, brands(name, group_id)')
    .eq('id', integrationId)
    .single()
  
  if (!integration || !integration.brands) return
  
  // Get admin emails for the brand
  const { data: admins } = await supabaseAdmin
    .from('brand_memberships')
    .select('user_id, profiles(email)')
    .eq('brand_id', integration.brand_id)
    .eq('role', 'admin')
  
  for (const admin of admins || []) {
    if (admin.profiles?.email) {
      await sendSocialConnectionDisconnected({
        to: admin.profiles.email,
        brandName: integration.brands.name,
        platform: integration.provider,
        reconnectLink: `${process.env.NEXT_PUBLIC_APP_URL}/brands/${integration.brand_id}/settings/integrations`,
      })
    }
  }
}
```

---

## Environment Variables Required

Make sure these are set in your Vercel environment:

```env
RESEND_API_KEY=re_xxxxx
NEXT_PUBLIC_APP_URL=https://www.ferdy.io
```

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
