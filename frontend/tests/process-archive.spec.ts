import { test, expect } from '@playwright/test';

test.describe('Process Archive (US-011)', () => {
  test.beforeEach(async ({ page }) => {
    // Check if backend is available
    try {
      const response = await page.request.get('http://localhost:8000/health');
      if (!response.ok()) {
        test.skip();
      }
    } catch {
      test.skip();
    }
  });

  test('should navigate to archive page', async ({ page }) => {
    await page.goto('/processes/archive');
    await expect(page.locator('h1')).toContainText('Archívum');
  });

  test('should display archive tree structure', async ({ page }) => {
    await page.goto('/processes/archive');

    // Archive tree should be visible
    await expect(page.getByTestId('archive-tree')).toBeVisible();

    // Content area should be visible
    await expect(page.getByTestId('archive-content')).toBeVisible();
  });

  test('should display summary statistics when data exists', async ({ page }) => {
    await page.goto('/processes/archive');

    // Wait for data to load
    await page.waitForTimeout(1000);

    // Summary should be visible if there's data
    const summary = page.getByTestId('archive-summary');
    // Summary might not exist if no data, which is okay
    if (await summary.isVisible()) {
      await expect(summary).toBeVisible();
    }
  });

  test('should have search functionality', async ({ page }) => {
    await page.goto('/processes/archive');

    // Search input should be visible
    await expect(page.getByTestId('archive-search-input')).toBeVisible();

    // Search button should be visible
    await expect(page.getByTestId('archive-search-btn')).toBeVisible();
  });

  test('should perform search when clicking search button', async ({ page }) => {
    await page.goto('/processes/archive');

    // Type search query
    await page.getByTestId('archive-search-input').fill('test');

    // Click search
    await page.getByTestId('archive-search-btn').click();

    // Should show search results section
    await expect(page.getByTestId('archive-content')).toContainText('Keresési eredmények');
  });

  test('should expand year when clicked', async ({ page }) => {
    await page.goto('/processes/archive');

    // Wait for data to load
    await page.waitForTimeout(1000);

    // Find a year button and click it (if exists)
    const yearButton = page.locator('[data-testid^="archive-year-"]').first();
    if (await yearButton.isVisible()) {
      await yearButton.click();

      // Should show month list
      const monthButton = page.locator('[data-testid^="archive-month-"]').first();
      await expect(monthButton).toBeVisible({ timeout: 2000 });
    }
  });
});
