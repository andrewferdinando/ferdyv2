# Groups and Billing System

## Overview

Ferdy uses a **Group-based billing system** where:
- **Groups** represent companies/agencies (top-level account)
- **Brands** belong to Groups
- **Billing** is per-brand, per-month via Stripe
- **Users** belong to Groups with roles (owner, admin, billing, member)

## Architecture

```
Group (Company/Agency)
├── Group Memberships (users with roles)
├── Brands (1 to many)
│   └── Brand Memberships (users with brand-level access)
└── Stripe Subscription
    ├── Customer ID
    ├── Subscription ID
    └── Quantity = number of brands
```

## Database Schema

### `groups` Table
- `id` (UUID, PK)
- `name` (text) - Company/agency name
- `stripe_customer_id` (text, unique)
- `stripe_subscription_id` (text, unique)
- `stripe_price_id` (text)
- `price_per_brand_cents` (integer, default 14700) - $147.00 NZD
- `currency` (text, default 'nzd')
- `negotiated_rate_cents` (integer, nullable) - Custom pricing override
- `country_code` (text, nullable)
- `tax_rate` (decimal, nullable)
- `created_at`, `updated_at`

### `group_memberships` Table
- `id` (UUID, PK)
- `group_id` (UUID, FK → groups.id)
- `user_id` (UUID, FK → auth.users.id)
- `role` (enum: 'owner', 'admin', 'billing', 'member')
- `created_at`

**Roles:**
- **owner**: Full control, can delete group, manage billing
- **admin**: Can add/remove brands, manage team
- **billing**: Can view/manage billing only
- **member**: Read-only access

### `brands` Table (Updated)
- Added `group_id` (UUID, FK → groups.id, NOT NULL)
- All brands must belong to a Group

## Stripe Integration

### Product & Pricing
- **Product**: "Ferdy Subscription" (`prod_TsnRdORd80oMap`)
- **Price**: $147 NZD/month per brand (`price_1Sv1qkK7D1xWdfkZtBcDnXzf`)
- **Billing**: Usage-based (quantity = number of brands)
- **Proration**: Automatic when brands added/removed
- **Mode**: Live (`STRIPE_MODE=live`)

### Coupons
- `group20` - 20% off, forever
- `agency40` - 40% off, forever
- `andrew50` - 50% off, forever

### API Routes

#### `/api/stripe/create-subscription`
Creates Stripe customer and subscription for a Group.

**Request:**
```json
{
  "groupId": "uuid",
  "groupName": "Company Name",
  "email": "billing@company.com",
  "countryCode": "US",
  "brandCount": 1
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_xxx"
}
```

#### `/api/stripe/update-quantity`
Updates subscription quantity when brands are added/removed.

**Request:**
```json
{
  "groupId": "uuid",
  "brandCount": 3
}
```

**Response:**
```json
{
  "success": true,
  "newQuantity": 3
}
```

#### `/api/stripe/billing-portal`
Creates Stripe Customer Portal session for self-service billing.

**Request:**
```json
{
  "groupId": "uuid",
  "returnUrl": "https://www.ferdy.io/account/billing"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/xxx"
}
```

#### `/api/stripe/webhook`
Handles Stripe webhook events.

**Events Handled:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted` → Sends subscription cancelled email
- `invoice.paid` → Sends receipt email
- `invoice.payment_failed` → Sends payment failed email

### Webhook Setup
Webhook endpoint: `https://www.ferdy.io/api/stripe/webhook`

**Environment Variable:**
```
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## User Flows

### 1. Onboarding (New User)

**Route:** `/onboarding/start`

**Steps:**
1. User enters:
   - Company/Agency name
   - First brand name
   - Billing email
   - Country
2. System creates:
   - Group record
   - Group membership (user as owner)
   - Brand record
   - Brand membership (user as owner)
   - Stripe customer
   - Stripe subscription (quantity=1)
3. User enters payment details (Stripe Payment Element)
4. Redirect to `/brands`

**Super Admin Skip:**
- Super admins can skip payment for testing/invoice customers
- Group created without Stripe subscription

### 2. Adding a Brand

**Route:** `/account/add-brand`

**Steps:**
1. User must be Group owner or admin
2. Brand is created with `group_id`
3. System counts brands in Group
4. Calls `/api/stripe/update-quantity` with new count
5. Stripe automatically prorates the charge

**Example:**
- User has 2 brands ($172/month)
- Adds 3rd brand on day 15 of billing cycle
- Prorated charge: ~$43 (half month for 1 brand)
- Next full invoice: $258/month (3 brands)

### 3. Removing a Brand

**Steps:**
1. Only Group owners can delete brands
2. Brand is deleted (cascade deletes brand_memberships)
3. System counts remaining brands
4. Calls `/api/stripe/update-quantity` with new count
5. Stripe automatically prorates the credit

### 4. Managing Billing

**Route:** `/account/billing`

**Features:**
- View subscription overview
- See brand count and monthly total
- View next billing date
- See payment method
- "Manage Billing" button → Stripe Customer Portal

**Stripe Customer Portal:**
- Update payment method
- View invoice history
- Download invoices
- Cancel subscription

## Email Notifications

All emails sent via **Resend** (`andrew@ferdy.io` receives copies).

### Welcome Email
**Trigger:** User completes onboarding
**Content:** Welcome message, next steps

### Subscription Confirmation
**Trigger:** Stripe subscription created
**Content:** Subscription details, brand count, monthly total

### Invoice Paid
**Trigger:** Stripe webhook `invoice.paid`
**Content:** Payment receipt, invoice link

### Payment Failed
**Trigger:** Stripe webhook `invoice.payment_failed`
**Template:** `src/emails/PaymentFailed.tsx`
**Content:** Failed amount, link to update payment method

### Subscription Cancelled
**Trigger:** Stripe webhook `customer.subscription.deleted`
**Template:** `src/emails/SubscriptionCancelled.tsx`
**Content:** Group name, information about service stopping at end of billing period

### Brand Added
**Trigger:** Brand created
**Template:** `src/emails/BrandAdded.tsx`
**Content:** New brand name, updated monthly total

## Environment Variables

### Required
```bash
# Stripe (Live mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRODUCT_ID=prod_TsnRdORd80oMap
STRIPE_PRICE_ID=price_1Sv1qkK7D1xWdfkZtBcDnXzf
STRIPE_MODE=live

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Resend
RESEND_API_KEY=re_xxx

# App
NEXT_PUBLIC_APP_URL=https://www.ferdy.io
```

## Testing

### Test Mode
Set `STRIPE_MODE=test` in `.env.local` to use test keys.

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Webhook Testing
Use Stripe CLI to forward webhooks to localhost:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Troubleshooting

### Subscription not updating when brand added
1. Check Stripe Dashboard → Subscriptions
2. Verify `group.stripe_subscription_id` is set
3. Check API logs for `/api/stripe/update-quantity` errors
4. Ensure webhook secret is correct

### Payment failed emails not sending
1. Check Resend dashboard for delivery status
2. Verify `RESEND_API_KEY` is set
3. Check webhook is receiving `invoice.payment_failed` events

### User can't access billing page
1. Verify user has Group membership
2. Check `group_memberships.role` is 'owner' or 'billing'
3. Ensure Group has `stripe_customer_id`

## Future Enhancements

- [ ] Team-level invites (invite users to Group)
- [ ] Multi-currency support
- [ ] Annual billing option
- [ ] Usage-based pricing tiers
- [ ] Group switching (users in multiple Groups)
- [ ] Audit log for billing changes
