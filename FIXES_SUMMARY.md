# Brand Status Filtering and Stripe Sync Fixes

## Summary

Fixed three critical issues with brand management:

1. **Stripe subscription quantity out of sync** - Stripe was showing 4 brands when only 2 were active
2. **Brands page showing inactive brands** - All brands (including soft-deleted ones) were visible
3. **Brand queries not filtering by status** - Multiple queries across the app were missing status filters

## Changes Made

### 1. Fixed Brand Removal API (`/src/api/brands/remove/route.ts`)

**Problem:** When removing a brand, the API was decrementing the Stripe subscription quantity by 1 from the current value, rather than counting actual active brands.

**Fix:** After soft-deleting the brand and memberships, the API now:
- Counts the actual number of active brands in Supabase
- Updates Stripe subscription quantity to match this exact count
- This ensures Stripe always reflects reality, even if it was previously out of sync

**Code Change:**
```typescript
// OLD: Decrement from current Stripe value
const newQuantity = Math.max(1, currentQuantity - 1)

// NEW: Count actual active brands and sync to that number
const { count: activeBrandCount } = await supabaseAdmin
  .from('brands')
  .select('id', { count: 'exact', head: true })
  .eq('group_id', brand.group_id)
  .eq('status', 'active')

const newQuantity = Math.max(1, activeBrandCount || 0)
```

### 2. Fixed Brands Page (`/src/app/(dashboard)/brands/page.tsx`)

**Problem:** The brands page was showing all brands, including soft-deleted ones with `status='inactive'`.

**Fix:** Added status filter to only show active brands:
```typescript
const { data: brands } = await supabase
  .from('brands')
  .select('*')
  .eq('group_id', user.group_id)
  .eq('status', 'active')  // NEW: Only show active brands
  .order('created_at', { ascending: false })
```

### 3. Fixed useBrands Hook (`/src/hooks/useBrands.ts`)

**Problem:** The hook was fetching all brands without filtering by status.

**Fix:** Added status filter:
```typescript
const { data, error } = await supabase
  .from('brands')
  .select('*')
  .eq('group_id', groupId)
  .eq('status', 'active')  // NEW: Only fetch active brands
  .order('created_at', { ascending: false })
```

### 4. Fixed useBrand Hook (`/src/hooks/useBrand.ts`)

**Problem:** The hook was fetching brands without status filter.

**Fix:** Added status filter:
```typescript
const { data, error } = await supabase
  .from('brands')
  .select('*')
  .eq('id', brandId)
  .eq('status', 'active')  // NEW: Only fetch if active
  .single()
```

### 5. Fixed Add Brand Action (`/src/app/(dashboard)/account/add-brand/actions.ts`)

**Problem:** When counting brands to update Stripe, the query was not filtering by status.

**Fix:** Added status filter to brand count:
```typescript
const { count } = await supabaseAdmin
  .from('brands')
  .select('id', { count: 'exact', head: true })
  .eq('group_id', brandData.group_id)
  .eq('status', 'active')  // NEW: Only count active brands
```

## Testing Instructions

### Test 1: Verify Brands Page Shows Only Active Brands

1. Log in to ferdy.io
2. Navigate to the Brands page
3. **Expected:** Should only see 2 active brands (not 5)
4. **Verify:** No inactive/deleted brands are visible

### Test 2: Verify Stripe Quantity Matches Active Brand Count

1. Log in to Stripe Dashboard (test mode)
2. Find the "Test Group" subscription
3. **Expected:** Subscription quantity should show 2 (matching the 2 active brands)
4. **Verify:** Quantity matches actual active brand count in Supabase

### Test 3: Test Brand Deletion Updates Stripe Correctly

1. Log in to ferdy.io
2. Go to Brands page (should show 2 brands)
3. Delete one brand
4. **Expected:** 
   - Brands page now shows 1 brand
   - Stripe subscription quantity updates to 1
   - Email notification sent with correct brand count
5. **Verify:** Check Stripe Dashboard to confirm quantity is now 1

### Test 4: Test Adding Brand Updates Stripe Correctly

1. From the test above (with 1 brand), add a new brand
2. **Expected:**
   - Brands page now shows 2 brands
   - Stripe subscription quantity updates to 2
   - Email notification sent with correct brand count
3. **Verify:** Check Stripe Dashboard to confirm quantity is now 2

### Test 5: Verify Email Notifications Show Correct Counts

1. After adding or deleting a brand, check the email sent to your account
2. **Expected:** Email should show the correct current brand count
3. **Verify:** Brand count in email matches what you see in the app and Stripe

## Database State

### Current State (Before Testing)

**Brands Table:**
- Total brands: 5
- Active brands: 2
- Inactive brands: 3

**Expected Behavior:**
- UI shows: 2 brands
- Stripe quantity: 2
- Queries return: 2 brands

## Deployment

**Status:** ✅ Deployed to Production

**Deployment URL:** https://ferdyv2-rlhoxm82z-andrew-ferdinandos-projects.vercel.app

**Git Commit:** `253f254` - "Fix brand status filtering and Stripe quantity sync"

## Related Documentation

- Email system documentation: `/src/lib/emails/TRIGGERS.md`
- Process documentation: `/docs/processes/README.md`
- Brand management flow: `/docs/processes/brand-management.md` (if exists)

## Notes

- All changes use the soft-delete pattern (status='inactive') rather than hard deletes
- Stripe subscription quantity now always reflects the actual active brand count
- The fix is self-healing: even if Stripe was previously out of sync, the next brand removal will correct it
- Email notifications continue to work and show accurate brand counts
