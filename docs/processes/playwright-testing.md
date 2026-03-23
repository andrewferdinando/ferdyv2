# Playwright E2E Testing

## Overview

End-to-end tests using Playwright against an isolated Supabase branch database and Stripe test mode. Production data is never touched.

## Architecture

```
Playwright (browser) → localhost:3000 (Next.js dev server)
                              ↓
                    Supabase Branch DB (isolated clone)
                    Stripe Test Mode (no real charges)
                    Resend disabled (no emails sent)
```

### Key Decisions
- **Supabase branching** isolates test data from production. Branch is created via MCP, schema replicated from production.
- **Stripe test mode** keys are used so no real charges occur. Test card: `4242 4242 4242 4242`.
- **Resend is disabled** by setting `RESEND_API_KEY=re_test_disabled` — email-sending functions will fail silently or return errors that are caught.
- **Tests run sequentially** (`workers: 1`, `fullyParallel: false`) because many tests build on shared state (e.g. test users, groups).

## File Structure

```
playwright.config.ts          # Config: dev server, env vars, browser settings
.env.test                     # Branch Supabase URL/keys, Stripe test keys (gitignored)
tests/
  helpers/
    supabase-admin.ts          # Admin client + CRUD helpers for test data
    auth.ts                    # Sign-in/sign-out helpers for Playwright pages
  e2e/
    01-role-access.spec.ts     # Role-based page access guards
    02-team-invite.spec.ts     # Team invite flow (new/existing users, role variants)
    03-onboarding.spec.ts      # Full onboarding + Stripe payment (needs test price)
    04-add-brand.spec.ts       # Add brand form access by role
    05-billing.spec.ts         # Billing page display and amounts
```

## Setup

### Prerequisites
- Node.js 18+
- Playwright installed: `npm init playwright@latest`
- Supabase branch with production schema
- Stripe test mode keys

### 1. Create a Supabase Branch

Using Claude Code with Supabase MCP:
```
Create a Supabase branch for project opzmnjkzsmsxusgledap
```

This creates a branch project (e.g. `yrldovxoekpdgeqpucmt`) with its own URL and API keys. The branch database starts empty — the schema must be replicated from production (Claude Code handles this automatically).

### 2. Configure `.env.test`

```env
# Supabase Branch
NEXT_PUBLIC_SUPABASE_URL=https://<branch-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<branch-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<branch-service-role-key>

# Stripe Test Mode
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRODUCT_ID=prod_...       # Must exist in Stripe test mode
STRIPE_PRICE_ID=price_...        # Must exist in Stripe test mode
STRIPE_MODE=test
STRIPE_WEBHOOK_SECRET=whsec_test_placeholder

# Disabled services
RESEND_API_KEY=re_test_disabled
OPENAI_API_KEY=sk-test-disabled

# App URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=test-cron-secret
TOKEN_ENC_SECRET=<same-as-production>
```

**Where to find the branch keys:**
- Anon key: returned by `get_publishable_keys` MCP tool
- Service role key: Supabase Dashboard → branch project → Settings → API → "service_role" (click Reveal)

### 3. Run Tests

```bash
# Run all tests
npx playwright test

# Run a specific suite
npx playwright test tests/e2e/01-role-access.spec.ts

# Run a specific test by name
npx playwright test --grep "2c"

# Run with headed browser (visible)
npx playwright test --headed

# Run with UI mode (interactive)
npx playwright test --ui

# View test report after run
npx playwright show-report
```

### 4. Cleanup

Delete the Supabase branch when done to stop billing (~$0.01/hr):
```
Delete Supabase branch 9f491b82-7b0c-4593-a056-03a00c297072
```

## Writing New Tests

### Test Data Pattern

Tests create their own data in `beforeAll` and clean up in `afterAll`:

```typescript
import {
  createTestUser,
  createTestGroup,
  createTestBrand,
  addGroupMember,
  addBrandMember,
  deleteTestUser,
  cleanupTestGroup,
} from '../helpers/supabase-admin';
import { signIn } from '../helpers/auth';

let owner: TestUser;
let group: TestGroup;
let brand: TestBrand;

test.beforeAll(async () => {
  owner = await createTestUser('pw-mytest@test.ferdy.io', 'TestPass123!', 'PW Test User');
  group = await createTestGroup('PW My Test Group', owner.id);
  brand = await createTestBrand('PW My Test Brand', group.id, owner.id);
});

test.afterAll(async () => {
  await cleanupTestGroup(group.id);
  await deleteTestUser(owner.id);
});
```

### Available Helpers (`tests/helpers/supabase-admin.ts`)

| Helper | Purpose |
|--------|---------|
| `createTestUser(email, password, name)` | Creates auth user + profile |
| `deleteTestUser(userId)` | Deletes user (cascades memberships) |
| `createTestGroup(name, ownerId)` | Creates group + owner membership |
| `createTestBrand(name, groupId, adminId)` | Creates brand + admin membership |
| `addGroupMember(groupId, userId, role)` | Adds/updates group membership |
| `addBrandMember(brandId, userId, role)` | Adds/updates brand membership |
| `cleanupTestGroup(groupId)` | Deletes group + all brands + memberships |
| `supabaseAdmin` | Raw admin client for custom queries |

### Auth Helper (`tests/helpers/auth.ts`)

```typescript
// Sign in via the UI (navigates to /auth/sign-in, fills form, waits for redirect)
await signIn(page, 'pw-mytest@test.ferdy.io', 'TestPass123!');

// Sign out (clears session)
await signOut(page);
```

### Naming Conventions

- **Test emails**: Use `pw-*@test.ferdy.io` prefix to clearly identify test data
- **Group/brand names**: Use `PW ` prefix (e.g. "PW Test Group")
- **Test file names**: Number prefix for run order (e.g. `01-`, `02-`)

### Common Selector Patterns

The app uses Tailwind CSS without many semantic labels. Common patterns:

```typescript
// Buttons — use exact: true to avoid matching Next.js Dev Tools button
await page.getByRole('button', { name: 'Next', exact: true }).click();

// Inputs by placeholder (many forms use placeholder, not <label>)
await page.getByPlaceholder('Acme Studios').fill('Brand Name');
await page.getByPlaceholder('Enter full name').fill('John Doe');

// Labels with asterisks (required fields show "Field Name *")
await expect(page.getByText('Time Zone *')).toBeVisible();

// Avoid strict mode violations (label + option with same text)
await expect(page.getByText('Country', { exact: true })).toBeVisible();

// Role badges from GROUP_ROLES / BRAND_ROLES
await expect(page.getByText('Group Owner')).toBeVisible();
await expect(page.getByText('Brand Admin')).toBeVisible();
```

### Testing Role-Based Access

The app gates admin pages on group-level roles. Test pattern:

```typescript
// Should have access
await page.goto(`/brands/${brandId}/account/team`);
await expect(page.getByText('Invite Member')).toBeVisible();

// Should be blocked
await page.goto(`/brands/${brandId}/account/team`);
await expect(page.getByText("You don't have access")).toBeVisible({ timeout: 10_000 });
```

Pages with access guards: `/account/team`, `/account/billing`, `/account/brand`, `/account/add-brand`

### Testing Stripe Flows

For tests that need Stripe (onboarding, add brand with payment):

1. The `STRIPE_PRODUCT_ID` and `STRIPE_PRICE_ID` must exist in **Stripe test mode** — live mode IDs won't work with test keys
2. Use test card `4242 4242 4242 4242`, expiry `12/30`, CVC `123`
3. Stripe Elements load in an iframe:
   ```typescript
   const stripeFrame = page.frameLocator('iframe[title*="Secure payment"]').first();
   await stripeFrame.getByPlaceholder(/card number/i).fill('4242424242424242');
   ```

### Debugging Failed Tests

```bash
# View HTML report with screenshots and traces
npx playwright show-report

# Run single test with visible browser
npx playwright test --headed --grep "test name"

# Run with trace recording
npx playwright test --trace on
```

Failed tests save screenshots and videos to `test-results/`. Error context files (`.md`) contain the full page snapshot at the time of failure — useful for identifying selector issues.

## Current Test Coverage

| Suite | Tests | What It Covers |
|-------|-------|----------------|
| 01 - Role Access | 12 | Owner/Admin/Member access to Team, Billing, Brand Settings, Add Brand |
| 02 - Team Invite | 5 | Invite new user (admin/member), invite existing user, group admin can invite, member blocked |
| 03 - Onboarding | 1 | Full signup + payment flow (needs Stripe test product) |
| 04 - Add Brand | 3 | Form access by role (owner, admin, member) |
| 05 - Billing | 3 | Billing page display, brand count, non-admin view |

## Bugs Found During Testing (March 2026)

Testing the onboarding and team management flows uncovered several bugs that were fixed:

| Bug | Impact | Fix |
|-----|--------|-----|
| `requireAdminForBrand` only checked brand-level admin | Group Admins who were Brand Editors couldn't perform team actions (invite, remove, role change) | Now falls back to group-level admin check (owner/admin/super_admin) |
| Team page only loaded members for brand admins | Group Admins with Brand Editor role saw empty team list | useEffect now triggers `refreshTeam()` when `isGroupAdmin` is true |
| `sendTeamInvite` overwrote `profiles.role` | Inviting an existing user overwrote their group role (e.g. super_admin) with the brand role (editor) | Now preserves existing profiles.role |
| `refreshTeam()` after invite had no error handling | Unhandled promise rejection could trigger error boundary | Added `.catch()` |
| Payment setup page hardcoded `countryCode: 'US'` | NZ customers wouldn't get GST applied when completing payment from billing page | Now uses `group.country_code` from database |

## Onboarding Flow Verification

The following customer onboarding flow was verified by tracing through the code (March 2026):

**Flow: Onboard → Skip Payment → Add Team → Pay with Discount → Add Brand**

| Step | Action | Status | Notes |
|------|--------|--------|-------|
| 1 | Onboard: create group + first brand | Works | `/api/onboarding/signup` creates all records |
| 2 | Skip payment ("Set up payment later") | Works | Group stays `subscription_status = 'incomplete'` |
| 3 | Add group admin via Team page invite | Works | No subscription check on invite flow |
| 4 | Billing page → "Complete Payment Setup" | Works | Shows CTA when status is incomplete |
| 5 | Enter discount/coupon code | Works | Payment-setup page has coupon input + Apply button |
| 6 | Complete Stripe payment | Works | Subscription created with coupon, webhook sets status to 'active' |
| 7 | Add 2nd brand | Works | Only available after subscription is active |

**Important**: Payment (steps 4-6) must happen BEFORE adding the 2nd brand (step 7). The Add Brand page blocks with a warning when `subscription_status != 'active'`.

**GST Note**: `STRIPE_GST_TAX_RATE_ID` must be set in `.env.local` for NZ GST to be applied to Stripe invoices. If not set, GST is not included on the Stripe side.

## Supabase Branch Management

### Creating a Branch
```
# Via Claude Code with Supabase MCP:
# 1. Get cost confirmation
# 2. Create the branch
# 3. Replicate schema from production (25 tables, 38 functions, 74 RLS policies, 87 indexes, 18 triggers)
```

The branch schema must be replicated manually because Supabase branch migrations fail when migrations are incremental ALTERs without a base schema. Claude Code handles this by querying production's `information_schema` and recreating everything on the branch.

### Current Branch
- **Branch ref**: `yrldovxoekpdgeqpucmt`
- **Branch ID**: `9f491b82-7b0c-4593-a056-03a00c297072`
- **Parent**: `opzmnjkzsmsxusgledap` (Ferdy production)
- **Cost**: ~$0.01/hr ($0.32/day)
- **Delete when done**: Use Supabase MCP `delete_branch` to stop billing

## Future Test Ideas

- [ ] Onboarding with Stripe test product/price (need to create product in Stripe test mode)
- [ ] Add brand with Stripe subscription update
- [ ] Billing page amounts with discount coupon
- [ ] Complete payment from billing page (end-to-end with Stripe test mode)
- [ ] Category creation wizard (FrameworkItemWizard)
- [ ] Draft generation trigger after category creation
- [ ] Social account connection flow (Facebook, Instagram, LinkedIn)
- [ ] Publishing flow (mock external APIs)
- [ ] Schedule page filters and navigation
- [ ] Profile page (all groups/brands display)
- [ ] Transfer group ownership
- [ ] Remove team member (with social account warnings)
- [ ] Onboarding with multiple brands toggle
- [ ] Brand Editor access (can see content pages, blocked from admin pages)
