import { test, expect } from '@playwright/test';

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('displays settings page with tabs', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Beállítások');
    const tabs = ['Általános', 'AI Személyiség', 'Téma', 'Értesítések', 'Tudásbázis', 'Státuszok', 'Folyamatok'];
    for (const tab of tabs) {
      await expect(page.getByRole('button', { name: tab })).toBeVisible();
    }
  });

  test('general tab has API key field with password type', async ({ page }) => {
    const apiKeyInput = page.locator('input[type="password"]');
    await expect(apiKeyInput).toBeVisible();
  });

  test('general tab has all required fields', async ({ page }) => {
    await expect(page.getByText('OpenRouter API kulcs')).toBeVisible();
    await expect(page.getByText('OpenRouter alapértelmezett modell')).toBeVisible();
    await expect(page.getByText('Ollama base URL')).toBeVisible();
    await expect(page.getByText('Ollama modell')).toBeVisible();
    await expect(page.getByText('Chat kontextus méret')).toBeVisible();
    await expect(page.getByText('Audit log megőrzés')).toBeVisible();
    await expect(page.getByText('Automatikus havi feladat generálás')).toBeVisible();
  });

  test('can switch between tabs', async ({ page }) => {
    await page.getByRole('button', { name: 'AI Személyiség' }).click();
    await expect(page.getByText('AI személyiség és viselkedés')).toBeVisible();

    await page.getByRole('button', { name: 'Státuszok' }).click();
    await expect(page.getByText('Folyamat státuszok kezelése')).toBeVisible();

    await page.getByRole('button', { name: 'Folyamatok' }).click();
    await expect(page.getByText('Folyamat típusok és sablonok')).toBeVisible();
  });

  test('save button exists', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Mentés' })).toBeVisible();
  });
});
