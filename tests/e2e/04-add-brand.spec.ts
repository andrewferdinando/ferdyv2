/**
 * Test 4: Add Brand
 *
 * Tests the add brand flow for different role levels.
 */
import { test, expect } from '@playwright/test';
import {
  supabaseAdmin,
  createTestUser,
  createTestGroup,
  createTestBrand,
  addGroupMember,
  addBrandMember,
  deleteTestUser,
  cleanupTestGroup,
  TestUser,
  TestGroup,
  TestBrand,
} from '../helpers/supabase-admin';
import { signIn } from '../helpers/auth';

let owner: TestUser;
let groupAdmin: TestUser;
let groupMember: TestUser;
let group: TestGroup;
let brand: TestBrand;

test.beforeAll(async () => {
  owner = await createTestUser('pw-addbrand-owner@test.ferdy.io', 'TestPass123!', 'PW AddBrand Owner');
  groupAdmin = await createTestUser('pw-addbrand-gadmin@test.ferdy.io', 'TestPass123!', 'PW AddBrand Admin');
  groupMember = await createTestUser('pw-addbrand-member@test.ferdy.io', 'TestPass123!', 'PW AddBrand Member');

  group = await createTestGroup('PW AddBrand Test Group', owner.id);
  brand = await createTestBrand('PW AddBrand First', group.id, owner.id);

  await addGroupMember(group.id, groupAdmin.id, 'admin');
  await addBrandMember(brand.id, groupAdmin.id, 'admin');

  await addGroupMember(group.id, groupMember.id, 'member');
  await addBrandMember(brand.id, groupMember.id, 'editor');
});

test.afterAll(async () => {
  // Clean up any brands created during tests
  await supabaseAdmin.from('brands').delete().eq('group_id', group.id);
  await cleanupTestGroup(group.id);
  await deleteTestUser(owner.id);
  await deleteTestUser(groupAdmin.id);
  await deleteTestUser(groupMember.id);
});

test.describe('Add Brand — Group Owner', () => {
  test('4a: Owner can access and fill add brand form', async ({ page }) => {
    await signIn(page, owner.email, owner.password);
    await page.goto(`/brands/${brand.id}/account/add-brand`);

    // Should see the add brand form (heading "Add Brand")
    await expect(page.getByRole('heading', { name: 'Add Brand' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("You don't have access")).not.toBeVisible();

    // Fill brand name (uses placeholder "Acme Studios")
    const brandNameInput = page.getByPlaceholder('Acme Studios');
    await brandNameInput.fill('PW Brand Beta');

    // Create Brand button should now be enabled
    const createButton = page.getByRole('button', { name: 'Create Brand' });
    await expect(createButton).toBeEnabled({ timeout: 5_000 });

    // Verify form elements are present
    await expect(page.getByText('Time Zone *')).toBeVisible();
    await expect(page.getByText('Country', { exact: true })).toBeVisible();

    // NOTE: Actual brand creation requires a Stripe subscription on the group.
    // The full create flow (click Create → confirm → Stripe update) is tested
    // in the onboarding suite (03-onboarding) which sets up a real Stripe subscription.
  });
});

test.describe('Add Brand — Group Admin', () => {
  test('4b: Group Admin can access add brand page', async ({ page }) => {
    await signIn(page, groupAdmin.email, groupAdmin.password);
    await page.goto(`/brands/${brand.id}/account/add-brand`);

    await expect(page.getByText("You don't have access")).not.toBeVisible();
    // Should see the form (brand name input with placeholder)
    await expect(page.getByPlaceholder('Acme Studios')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Add Brand — Group Member (blocked)', () => {
  test('4c: Group Member cannot access add brand page', async ({ page }) => {
    await signIn(page, groupMember.email, groupMember.password);
    await page.goto(`/brands/${brand.id}/account/add-brand`);

    await expect(page.getByText("You don't have access")).toBeVisible({ timeout: 10_000 });
  });
});
