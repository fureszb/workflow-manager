import { test, expect } from '@playwright/test';

test.describe('Statuses management in Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Státuszok' }).click();
    await expect(page.getByText('Folyamat státuszok kezelése')).toBeVisible();
  });

  test('displays statuses tab with description and new status form', async ({ page }) => {
    await expect(page.getByTestId('new-status-form')).toBeVisible();
    await expect(page.getByTestId('new-status-name')).toBeVisible();
    await expect(page.getByTestId('new-status-color')).toBeVisible();
    await expect(page.getByTestId('add-status-btn')).toBeVisible();
  });

  test('can create a new status', async ({ page }) => {
    await page.getByTestId('new-status-name').fill('Teszt státusz');
    await page.getByTestId('add-status-btn').click();
    await expect(page.getByText('Státusz létrehozva!')).toBeVisible();
    await expect(page.getByText('Teszt státusz')).toBeVisible();
  });

  test('shows statuses loaded from API', async ({ page }) => {
    const statusList = page.getByTestId('status-list');
    await expect(statusList).toBeVisible();
  });

  test('can click on status name to enter edit mode', async ({ page }) => {
    // Create a status first
    await page.getByTestId('new-status-name').fill('Szerkesztendő');
    await page.getByTestId('add-status-btn').click();
    await expect(page.getByText('Szerkesztendő')).toBeVisible();

    // Click to edit
    await page.getByText('Szerkesztendő').click();
    await expect(page.getByTestId('edit-status-name')).toBeVisible();
    await expect(page.getByTestId('edit-status-color')).toBeVisible();
  });

  test('can delete a status', async ({ page }) => {
    await page.getByTestId('new-status-name').fill('Törlendő');
    await page.getByTestId('add-status-btn').click();
    await expect(page.getByText('Törlendő')).toBeVisible();

    // Find and click delete button for the created status
    const statusRow = page.locator('[data-testid^="status-item-"]').filter({ hasText: 'Törlendő' });
    await statusRow.locator('button[title="Törlés"]').click();
    await expect(page.getByText('Státusz törölve!')).toBeVisible();
  });
});
