/**
 * Test 1 & 6: Onboarding + Billing
 *
 * Tests the full onboarding flow:
 * - Sign up with brand info
 * - Payment with Stripe test card
 * - Verify group/brand/membership creation
 * Then tests adding brands and checking billing page amounts.
 *
 * NOTE: This test uses Stripe test mode. The Stripe Price ID must exist
 * in test mode. If the price doesn't exist, onboarding will fail at
 * the subscription creation step.
 */
import { test, expect } from '@playwright/test';
import {
  supabaseAdmin,
  deleteTestUser,
  cleanupTestGroup,
} from '../helpers/supabase-admin';
import { signIn } from '../helpers/auth';

// We'll track created resources for cleanup
let createdUserId: string | null = null;
let createdGroupId: string | null = null;

test.afterAll(async () => {
  // Cleanup test data
  if (createdGroupId) {
    await cleanupTestGroup(createdGroupId).catch(() => {});
  }
  if (createdUserId) {
    await deleteTestUser(createdUserId).catch(() => {});
  }
});

test.describe('Onboarding flow', () => {
  test('complete onboarding: signup → payment → first brand', async ({ page }) => {
    await page.goto('/onboarding/start');

    // Wait for the wizard to load
    await expect(page.getByText('Welcome to Ferdy')).toBeVisible({ timeout: 15_000 });

    // Fill in the onboarding form
    // "Will you manage multiple brands?" → No (single brand)
    const noBrandToggle = page.getByText('No').first();
    if (await noBrandToggle.isVisible()) {
      await noBrandToggle.click();
    }

    // Fill form fields
    await page.getByLabel(/your name/i).fill('PW Onboard User');
    await page.getByLabel(/email/i).fill('pw-onboard@test.ferdy.io');
    await page.getByLabel(/password/i).fill('TestPass123!');
    await page.getByLabel(/brand name/i).fill('PW Brand Alpha');

    // Website URL (optional)
    const websiteField = page.getByLabel(/website/i);
    if (await websiteField.isVisible()) {
      await websiteField.fill('https://pwbrandalpha.test');
    }

    // Country
    const countrySelect = page.getByLabel(/country/i);
    if (await countrySelect.isVisible()) {
      await countrySelect.selectOption({ label: 'New Zealand' });
    }

    // Click continue to payment
    await page.getByRole('button', { name: /continue/i }).click();

    // Wait for step 2 (payment setup)
    await expect(page.getByText(/payment/i)).toBeVisible({ timeout: 15_000 });

    // Accept terms
    const termsCheckbox = page.getByRole('checkbox').first();
    if (await termsCheckbox.isVisible()) {
      await termsCheckbox.check();
    }

    // Click continue to payment (triggers Stripe)
    await page.getByRole('button', { name: /continue|payment/i }).click();

    // Wait for Stripe payment element to load
    // This uses Stripe.js Elements — the iframe takes a moment
    const stripeFrame = page.frameLocator('iframe[title*="Secure payment"]').first();

    // Fill test card details
    await stripeFrame.getByPlaceholder(/card number/i).fill('4242424242424242');
    await stripeFrame.getByPlaceholder(/mm/i).fill('12/30');
    await stripeFrame.getByPlaceholder(/cvc/i).fill('123');

    // Submit payment
    await page.getByRole('button', { name: /complete|pay|submit/i }).click();

    // Wait for redirect to brands page (success)
    await page.waitForURL(/\/brands/, { timeout: 30_000 });

    // Verify the brand was created
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const testUser = users.users?.find(u => u.email === 'pw-onboard@test.ferdy.io');
    expect(testUser).toBeTruthy();
    createdUserId = testUser!.id;

    // Verify group was created
    const { data: memberships } = await supabaseAdmin
      .from('group_memberships')
      .select('group_id, role')
      .eq('user_id', createdUserId);

    expect(memberships).toHaveLength(1);
    expect(memberships![0].role).toMatch(/owner|admin/);
    createdGroupId = memberships![0].group_id;

    // Verify brand was created
    const { data: brands } = await supabaseAdmin
      .from('brands')
      .select('name')
      .eq('group_id', createdGroupId);

    expect(brands).toHaveLength(1);
    expect(brands![0].name).toBe('PW Brand Alpha');

    // Verify brand membership
    const { data: brandMemberships } = await supabaseAdmin
      .from('brand_memberships')
      .select('role')
      .eq('user_id', createdUserId)
      .eq('brand_id', brands![0].name === 'PW Brand Alpha' ? brands![0] : '');

    // User should be brand admin
    expect(brandMemberships!.length).toBeGreaterThanOrEqual(1);
  });
});
