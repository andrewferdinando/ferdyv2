/**
 * Test 5: Role-Based Access Guards
 *
 * Verifies that Group Owners/Admins can access admin pages
 * and Group Members see "no access" messages.
 */
import { test, expect } from '@playwright/test';
import {
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
import { signIn, signOut } from '../helpers/auth';

let owner: TestUser;
let groupAdmin: TestUser;
let groupMember: TestUser;
let group: TestGroup;
let brand: TestBrand;

test.beforeAll(async () => {
  // Create test users
  owner = await createTestUser('pw-owner@test.ferdy.io', 'TestPass123!', 'PW Owner');
  groupAdmin = await createTestUser('pw-gadmin@test.ferdy.io', 'TestPass123!', 'PW Group Admin');
  groupMember = await createTestUser('pw-member@test.ferdy.io', 'TestPass123!', 'PW Group Member');

  // Create group and brand
  group = await createTestGroup('PW Test Group', owner.id);
  brand = await createTestBrand('PW Test Brand', group.id, owner.id);

  // Add group admin
  await addGroupMember(group.id, groupAdmin.id, 'admin');
  await addBrandMember(brand.id, groupAdmin.id, 'admin');

  // Add group member
  await addGroupMember(group.id, groupMember.id, 'member');
  await addBrandMember(brand.id, groupMember.id, 'editor');
});

test.afterAll(async () => {
  await cleanupTestGroup(group.id);
  await deleteTestUser(owner.id);
  await deleteTestUser(groupAdmin.id);
  await deleteTestUser(groupMember.id);
});

// ─── Group Owner access ───

test.describe('Group Owner access', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, owner.email, owner.password);
  });

  test('can access Team page', async ({ page }) => {
    // First test may hit cold dev server compilation — use longer timeout
    await page.goto(`/brands/${brand.id}/account/team`, { timeout: 90_000 });
    await expect(page.getByText('Team')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Invite Member')).toBeVisible();
  });

  test('can access Billing page', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/billing`);
    await expect(page.getByText(/billing|subscription/i)).toBeVisible();
    await expect(page.getByText("You don't have access")).not.toBeVisible();
  });

  test('can access Brand Settings page', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/brand`);
    await expect(page.getByText("You don't have access")).not.toBeVisible();
  });

  test('can access Add Brand page', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/add-brand`);
    await expect(page.getByText("You don't have access")).not.toBeVisible();
  });
});

// ─── Group Admin access ───

test.describe('Group Admin access', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, groupAdmin.email, groupAdmin.password);
  });

  test('can access Team page', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/team`);
    await expect(page.getByText('Team')).toBeVisible();
    await expect(page.getByText('Invite Member')).toBeVisible();
  });

  test('can access Billing page', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/billing`);
    await expect(page.getByText("You don't have access")).not.toBeVisible();
  });

  test('can access Brand Settings page', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/brand`);
    await expect(page.getByText("You don't have access")).not.toBeVisible();
  });

  test('can access Add Brand page', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/add-brand`);
    await expect(page.getByText("You don't have access")).not.toBeVisible();
  });
});

// ─── Group Member access (should be blocked) ───

test.describe('Group Member access', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, groupMember.email, groupMember.password);
  });

  test('cannot access Team page', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/team`);
    await expect(page.getByText("You don't have access")).toBeVisible({ timeout: 10_000 });
  });

  test('cannot access Billing page', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/billing`);
    await expect(page.getByText("You don't have access")).toBeVisible({ timeout: 10_000 });
  });

  test('cannot access Brand Settings page', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/brand`);
    await expect(page.getByText("You don't have access")).toBeVisible({ timeout: 10_000 });
  });

  test('cannot access Add Brand page', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/add-brand`);
    await expect(page.getByText("You don't have access")).toBeVisible({ timeout: 10_000 });
  });
});
