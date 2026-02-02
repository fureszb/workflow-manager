import { test, expect } from '@playwright/test';

test('placeholder - app loads', async ({ page }) => {
  // Will be expanded in US-042
  await page.goto('/');
  await expect(page).toHaveTitle(/WorkFlow Manager/);
});
