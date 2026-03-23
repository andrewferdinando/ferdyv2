/**
 * Playwright auth helpers — sign in via the UI or set session directly.
 */
import { Page } from '@playwright/test';

export async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/sign-in');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to /brands (dashboard)
  await page.waitForURL(/\/brands/, { timeout: 15_000 });
}

export async function signOut(page: Page) {
  // Click user menu / sign out if visible
  await page.evaluate(() => {
    // Clear supabase session from localStorage
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    }
  });
  await page.goto('/auth/sign-in');
}
