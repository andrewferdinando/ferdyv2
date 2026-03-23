/**
 * Tests 2 & 3: Add Team Member (new user + existing user)
 *
 * Tests the two-step invite flow from the Team page:
 * Step 1: Name, email, group role
 * Step 2: Brand assignments
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
let existingUser: TestUser;
let group: TestGroup;
let brand: TestBrand;

test.beforeAll(async () => {
  owner = await createTestUser('pw-invite-owner@test.ferdy.io', 'TestPass123!', 'PW Invite Owner');
  existingUser = await createTestUser('pw-existing@test.ferdy.io', 'TestPass123!', 'PW Existing User');

  group = await createTestGroup('PW Invite Test Group', owner.id);
  brand = await createTestBrand('PW Invite Test Brand', group.id, owner.id);
});

test.afterAll(async () => {
  // Clean up any invites
  await supabaseAdmin.from('brand_invites').delete().eq('brand_id', brand.id);
  await cleanupTestGroup(group.id);
  await deleteTestUser(owner.id);
  await deleteTestUser(existingUser.id);
});

test.describe('Invite new user as Group Admin', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, owner.email, owner.password);
  });

  test('2a: Owner invites new user as Group Admin', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/team`);
    await page.getByText('Invite Member').click();

    // Step 1: Fill name, email, select Group Admin
    await page.getByPlaceholder('Enter full name').fill('New Admin User');
    await page.getByPlaceholder('Enter email address').fill('pw-newadmin@test.ferdy.io');

    // Select Group Admin radio
    const adminRadio = page.locator('input[name="groupRole"][value="admin"], input[name="groupRole"]').first();
    // Click the Group Admin option label
    await page.getByText('Group Admin').click();

    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2: Brand access — Group Admins get all brands pre-selected
    await expect(page.getByText('Brand Access')).toBeVisible();
    await expect(page.getByText('PW Invite Test Brand')).toBeVisible();

    // Send invitation
    await page.getByRole('button', { name: 'Send Invitation' }).click();

    // Verify success message
    await expect(page.getByText(/invitation sent/i)).toBeVisible({ timeout: 10_000 });

    // Verify invite was recorded in DB
    const { data: invite } = await supabaseAdmin
      .from('brand_invites')
      .select('email, role, status')
      .eq('brand_id', brand.id)
      .eq('email', 'pw-newadmin@test.ferdy.io')
      .single();

    expect(invite).toBeTruthy();
    expect(invite!.status).toMatch(/pending/);
  });

  test('2b: Owner invites new user as Group Member', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/team`);
    await page.getByText('Invite Member').click();

    // Step 1
    await page.getByPlaceholder('Enter full name').fill('New Member User');
    await page.getByPlaceholder('Enter email address').fill('pw-newmember@test.ferdy.io');

    // Group Member should be default
    await page.getByText('Group Member').click();

    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2: Select brand as editor
    await expect(page.getByText('Brand Access')).toBeVisible();

    // The brand should have a checkbox — ensure it's checked
    const brandCheckbox = page.locator(`input[type="checkbox"]`).first();
    if (!(await brandCheckbox.isChecked())) {
      await brandCheckbox.check();
    }

    await page.getByRole('button', { name: 'Send Invitation' }).click();
    await expect(page.getByText(/invitation sent/i)).toBeVisible({ timeout: 10_000 });

    // Verify in DB
    const { data: invite } = await supabaseAdmin
      .from('brand_invites')
      .select('email, role, status')
      .eq('brand_id', brand.id)
      .eq('email', 'pw-newmember@test.ferdy.io')
      .single();

    expect(invite).toBeTruthy();
    expect(invite!.status).toMatch(/pending/);
  });
});

test.describe('Invite existing user', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, owner.email, owner.password);
  });

  test('3a: Invite existing user as Group Member', async ({ page }) => {
    await page.goto(`/brands/${brand.id}/account/team`);
    await page.getByText('Invite Member').click();

    // Step 1
    await page.getByPlaceholder('Enter full name').fill('PW Existing User');
    await page.getByPlaceholder('Enter email address').fill(existingUser.email);
    await page.getByText('Group Member').click();

    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2
    await expect(page.getByText('Brand Access')).toBeVisible();
    const brandCheckbox = page.locator(`input[type="checkbox"]`).first();
    if (!(await brandCheckbox.isChecked())) {
      await brandCheckbox.check();
    }

    await page.getByRole('button', { name: 'Send Invitation' }).click();
    await expect(page.getByText(/invitation sent/i)).toBeVisible({ timeout: 10_000 });

    // Verify invite recorded as pending_existing
    const { data: invite } = await supabaseAdmin
      .from('brand_invites')
      .select('email, status')
      .eq('brand_id', brand.id)
      .eq('email', existingUser.email)
      .single();

    expect(invite).toBeTruthy();
    expect(invite!.status).toBe('pending_existing');

    // Verify existing user's profile.role was NOT overwritten
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', existingUser.id)
      .single();

    expect(profile!.role).toBe('admin'); // Should still be 'admin' from seed, not 'editor'
  });
});

test.describe('Group Admin can invite', () => {
  let groupAdmin: TestUser;

  test.beforeAll(async () => {
    groupAdmin = await createTestUser('pw-gadmin-invite@test.ferdy.io', 'TestPass123!', 'PW Group Admin Inviter');
    await addGroupMember(group.id, groupAdmin.id, 'admin');
    await addBrandMember(brand.id, groupAdmin.id, 'editor'); // Only brand editor, but group admin
  });

  test.afterAll(async () => {
    await deleteTestUser(groupAdmin.id);
  });

  test('2c: Group Admin (brand editor) can send invite', async ({ page }) => {
    await signIn(page, groupAdmin.email, groupAdmin.password);
    await page.goto(`/brands/${brand.id}/account/team`);

    // Should see the page (not "no access")
    await expect(page.getByText('Invite Member')).toBeVisible({ timeout: 10_000 });

    // Should also see team members listed
    await expect(page.getByText(owner.email)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Group Member cannot access team', () => {
  let groupMember: TestUser;

  test.beforeAll(async () => {
    groupMember = await createTestUser('pw-member-invite@test.ferdy.io', 'TestPass123!', 'PW Member No Access');
    await addGroupMember(group.id, groupMember.id, 'member');
    await addBrandMember(brand.id, groupMember.id, 'editor');
  });

  test.afterAll(async () => {
    await deleteTestUser(groupMember.id);
  });

  test('2d: Group Member cannot access team page', async ({ page }) => {
    await signIn(page, groupMember.email, groupMember.password);
    await page.goto(`/brands/${brand.id}/account/team`);
    await expect(page.getByText("You don't have access")).toBeVisible({ timeout: 10_000 });
  });
});
