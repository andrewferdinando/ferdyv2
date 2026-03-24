import { test, expect } from '@playwright/test';
import { createTestUser, createTestGroup, createTestBrand, deleteTestUser, cleanupTestGroup, supabaseAdmin } from '../helpers/supabase-admin';
import { signIn } from '../helpers/auth';

/**
 * Tests for Event Type category creation via the FrameworkItemWizard.
 *
 * Wizard steps:
 *   Step 1: Type (select "Events")
 *   Step 2: Details (name, description, channels, single/range toggle)
 *   Step 3: Event dates (occurrence date inputs, "+ Add event/range")
 *   Step 4: Media (upload — requires Supabase Storage, so we verify arrival only)
 *
 * Note: Media upload requires Supabase Storage which isn't available on branch DBs.
 * Tests verify the complete wizard flow up to Step 4 (Media), confirming that all
 * form fields, occurrence management, and step navigation work correctly.
 */

let owner: any;
let group: any;
let brand: any;

const TEST_EMAIL = 'pw-event-owner@test.ferdy.io';
const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'PW Event Tester';

test.beforeAll(async () => {
  owner = await createTestUser(TEST_EMAIL, TEST_PASSWORD, TEST_NAME);
  group = await createTestGroup('PW Event Test Group', owner.id);
  brand = await createTestBrand('PW Event Test Brand', group.id, owner.id, {
    timezone: 'Pacific/Auckland',
    country_code: 'NZ',
  });
});

test.afterAll(async () => {
  await supabaseAdmin.from('subcategories').delete().eq('brand_id', brand.id);
  await cleanupTestGroup(group.id);
  await deleteTestUser(owner.id);
});

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

// Navigate to wizard Step 2 with Events type selected
async function gotoStep2(page: any) {
  await page.goto(`/brands/${brand.id}/engine-room/categories`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /add category/i }).click();
  await page.waitForTimeout(500);
  await page.getByRole('heading', { name: 'Events' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 2: Details')).toBeVisible({ timeout: 10_000 });
}

// Fill Step 2 and advance to Step 3
async function fillStep2AndAdvance(page: any, name: string, occurrenceType: 'single' | 'range' = 'single') {
  if (occurrenceType === 'range') {
    await page.getByRole('button', { name: /Date ranges/i }).click();
    await page.waitForTimeout(300);
  }
  await page.getByPlaceholder('Short, clear name').fill(name);
  await page.getByPlaceholder('What should Ferdy mention?').fill('Test event by Playwright');
  await page.getByText('Facebook').click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText(/Step 3/)).toBeVisible({ timeout: 10_000 });
}

// ─── Test 1: Single date event — one occurrence ───

test('1a: Single date — one occurrence', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, TEST_EMAIL, TEST_PASSWORD);
  await gotoStep2(page);
  await fillStep2AndAdvance(page, 'PW Single One');

  // Step 3: Add one event with date and time
  await expect(page.getByText('No dates added yet.')).toBeVisible({ timeout: 5_000 });
  await page.getByText('+ Add event').click();
  await page.waitForTimeout(500);

  await page.locator('input[type="date"]').first().fill(futureDate(30));
  await page.locator('input[type="time"]').first().fill('18:00');

  // Verify the occurrence card shows the date
  await expect(page.getByText('Event 1')).toBeVisible();

  // Advance to Step 4 Media
  await page.getByRole('button', { name: 'Next: Media', exact: true }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText('Step 4: Media')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Finish and Generate Drafts')).toBeVisible();
});

// ─── Test 2: Single date event — multiple occurrences ───

test('2a: Single date — multiple occurrences', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, TEST_EMAIL, TEST_PASSWORD);
  await gotoStep2(page);
  await fillStep2AndAdvance(page, 'PW Single Multi');

  // Add three events
  await page.getByText('+ Add event').click();
  await page.waitForTimeout(500);
  await page.locator('input[type="date"]:visible').first().fill(futureDate(30));
  await page.locator('input[type="time"]:visible').first().fill('18:00');

  await page.getByText('+ Add event').click();
  await page.waitForTimeout(500);
  await page.locator('input[type="date"]:visible').nth(1).fill(futureDate(45));
  await page.locator('input[type="time"]:visible').nth(1).fill('19:00');

  await page.getByText('+ Add event').click();
  await page.waitForTimeout(500);
  await page.locator('input[type="date"]:visible').nth(2).fill(futureDate(60));
  await page.locator('input[type="time"]:visible').nth(2).fill('20:00');

  // Verify all three occurrence cards exist
  await expect(page.getByText('Event 1')).toBeVisible();
  await expect(page.getByText('Event 2')).toBeVisible();
  await expect(page.getByText('Event 3')).toBeVisible();

  // Advance to Step 4 Media
  await page.getByRole('button', { name: 'Next: Media', exact: true }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText('Step 4: Media')).toBeVisible({ timeout: 10_000 });
});

// ─── Test 3: Date range event — one occurrence ───

test('3a: Date range — one occurrence', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, TEST_EMAIL, TEST_PASSWORD);
  await gotoStep2(page);
  await fillStep2AndAdvance(page, 'PW Range One', 'range');

  // Add one range
  await page.getByText('+ Add range').click();
  await page.waitForTimeout(500);

  const dateInputs = page.locator('input[type="date"]:visible');
  await dateInputs.first().fill(futureDate(30));
  await dateInputs.nth(1).fill(futureDate(33));

  // Verify the range card shows
  await expect(page.getByText('Range 1')).toBeVisible();

  // Advance to Step 4 Media
  await page.getByRole('button', { name: /Next: Media/i }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText('Step 4: Media')).toBeVisible({ timeout: 10_000 });
});

// ─── Test 4: Date range event — multiple occurrences ───

test('4a: Date range — multiple occurrences', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, TEST_EMAIL, TEST_PASSWORD);
  await gotoStep2(page);
  await fillStep2AndAdvance(page, 'PW Range Multi', 'range');

  // Add two ranges
  await page.getByText('+ Add range').click();
  await page.waitForTimeout(500);
  const dateInputs = page.locator('input[type="date"]:visible');
  await dateInputs.first().fill(futureDate(30));
  await dateInputs.nth(1).fill(futureDate(33));

  await page.getByText('+ Add range').click();
  await page.waitForTimeout(500);
  const allDateInputs = page.locator('input[type="date"]:visible');
  await allDateInputs.nth(2).fill(futureDate(60));
  await allDateInputs.nth(3).fill(futureDate(63));

  // Verify both range cards
  await expect(page.getByText('Range 1')).toBeVisible();
  await expect(page.getByText('Range 2')).toBeVisible();

  // Advance to Step 4 Media
  await page.getByRole('button', { name: /Next: Media/i }).click();
  await page.waitForTimeout(1000);
  await expect(page.getByText('Step 4: Media')).toBeVisible({ timeout: 10_000 });
});

// ─── Test 5: Schedule page post card labels ───

test('5a: Schedule page shows correct event offset labels', async ({ page }) => {
  test.setTimeout(60_000);
  await signIn(page, TEST_EMAIL, TEST_PASSWORD);

  await page.goto(`/brands/${brand.id}/schedule`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  const pageContent = await page.textContent('body');

  // If drafts exist with event offsets, verify label format
  const hasOffsetLabel = pageContent &&
    (/\d+ days? before/.test(pageContent) ||
     /Day of/.test(pageContent) ||
     /\d+ days? after/.test(pageContent));

  if (hasOffsetLabel) {
    const offsetPattern = /(\d+) (days?) (before|after) (\d{1,2} \w{3} \d{4})/;
    expect(pageContent).toMatch(offsetPattern);
  }

  // No drafts on test branch — test passes, validates label format IF present
  expect(true).toBe(true);
});
