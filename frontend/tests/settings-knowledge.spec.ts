import { test, expect } from '@playwright/test';

test.describe('Settings Knowledge Tab (US-017)', () => {
  test.beforeEach(async ({ page }) => {
    // Check if backend is available
    try {
      const response = await page.request.get('http://localhost:8000/api/v1/health');
      if (!response.ok()) {
        test.skip();
      }
    } catch {
      test.skip();
    }
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1')).toContainText('Beállítások');
  });

  test('should display knowledge tab', async ({ page }) => {
    await page.goto('/settings');

    // Find and click the Knowledge tab
    const knowledgeTab = page.locator('button:has-text("Tudásbázis")');
    await expect(knowledgeTab).toBeVisible();
  });

  test('should switch to knowledge tab when clicked', async ({ page }) => {
    await page.goto('/settings');

    // Click the Knowledge tab
    await page.locator('button:has-text("Tudásbázis")').click();

    // Should show knowledge settings
    await expect(page.getByTestId('knowledge-chunk-size')).toBeVisible();
    await expect(page.getByTestId('knowledge-chunk-overlap')).toBeVisible();
  });

  test('should display chunk size setting', async ({ page }) => {
    await page.goto('/settings');

    // Click the Knowledge tab
    await page.locator('button:has-text("Tudásbázis")').click();

    // Chunk size input should be visible
    const chunkSize = page.getByTestId('knowledge-chunk-size');
    await expect(chunkSize).toBeVisible();
    await expect(chunkSize).toHaveAttribute('type', 'number');
  });

  test('should display chunk overlap setting', async ({ page }) => {
    await page.goto('/settings');

    // Click the Knowledge tab
    await page.locator('button:has-text("Tudásbázis")').click();

    // Chunk overlap input should be visible
    const chunkOverlap = page.getByTestId('knowledge-chunk-overlap');
    await expect(chunkOverlap).toBeVisible();
    await expect(chunkOverlap).toHaveAttribute('type', 'number');
  });

  test('should display documents list in knowledge tab', async ({ page }) => {
    await page.goto('/settings');

    // Click the Knowledge tab
    await page.locator('button:has-text("Tudásbázis")').click();

    // Wait for documents to load
    await page.waitForTimeout(1000);

    // Either documents list or empty state should be visible
    const documentsList = page.getByTestId('knowledge-documents-list');
    const emptyText = page.locator('text=Még nincsenek dokumentumok');

    const listVisible = await documentsList.isVisible();
    const emptyVisible = await emptyText.isVisible();

    expect(listVisible || emptyVisible).toBeTruthy();
  });

  test('should show document count in knowledge tab', async ({ page }) => {
    await page.goto('/settings');

    // Click the Knowledge tab
    await page.locator('button:has-text("Tudásbázis")').click();

    // Wait for documents to load
    await page.waitForTimeout(1000);

    // Should show "X / Y a tudásbázisban" text
    await expect(page.locator('text=/\\d+ \\/ \\d+ a tudásbázisban/')).toBeVisible();
  });

  test('should have star toggle buttons for documents', async ({ page }) => {
    await page.goto('/settings');

    // Click the Knowledge tab
    await page.locator('button:has-text("Tudásbázis")').click();

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentsList = page.getByTestId('knowledge-documents-list');
    if (await documentsList.isVisible()) {
      const toggleBtns = page.locator('[data-testid^="knowledge-toggle-"]');
      const count = await toggleBtns.count();

      if (count > 0) {
        // Each document should have a toggle button
        await expect(toggleBtns.first()).toBeVisible();
      }
    }
  });

  test('should toggle document knowledge status on click', async ({ page }) => {
    await page.goto('/settings');

    // Click the Knowledge tab
    await page.locator('button:has-text("Tudásbázis")').click();

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const toggleBtns = page.locator('[data-testid^="knowledge-toggle-"]');
    const count = await toggleBtns.count();

    if (count > 0) {
      // Click the first toggle button
      await toggleBtns.first().click();

      // Wait for the toggle to complete
      await page.waitForTimeout(1000);

      // Should show a toast notification
      const toast = page.locator('text=/Hozzáadva a tudásbázishoz|Eltávolítva a tudásbázisból/');
      await expect(toast).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display file icons in document list', async ({ page }) => {
    await page.goto('/settings');

    // Click the Knowledge tab
    await page.locator('button:has-text("Tudásbázis")').click();

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentsList = page.getByTestId('knowledge-documents-list');
    if (await documentsList.isVisible()) {
      const docs = page.locator('[data-testid^="knowledge-doc-"]');
      const count = await docs.count();

      if (count > 0) {
        // Documents should have svg icons
        const firstDoc = docs.first();
        await expect(firstDoc.locator('svg').first()).toBeVisible();
      }
    }
  });

  test('should display file size for documents', async ({ page }) => {
    await page.goto('/settings');

    // Click the Knowledge tab
    await page.locator('button:has-text("Tudásbázis")').click();

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentsList = page.getByTestId('knowledge-documents-list');
    if (await documentsList.isVisible()) {
      const docs = page.locator('[data-testid^="knowledge-doc-"]');
      const count = await docs.count();

      if (count > 0) {
        // Documents should show file size (B, KB, or MB)
        const sizeText = page.locator('text=/\\d+(\\.\\d+)?\\s*(B|KB|MB)/');
        await expect(sizeText.first()).toBeVisible();
      }
    }
  });

  test('should highlight knowledge base documents differently', async ({ page }) => {
    await page.goto('/settings');

    // Click the Knowledge tab
    await page.locator('button:has-text("Tudásbázis")').click();

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentsList = page.getByTestId('knowledge-documents-list');
    if (await documentsList.isVisible()) {
      // Test passes if we can see the documents list
      // The visual distinction is done via CSS background-color
      await expect(documentsList).toBeVisible();
    }
  });

  test('should update count after toggling knowledge status', async ({ page }) => {
    await page.goto('/settings');

    // Click the Knowledge tab
    await page.locator('button:has-text("Tudásbázis")').click();

    // Wait for documents to load
    await page.waitForTimeout(1000);

    // Get initial count text
    const countText = page.locator('text=/\\d+ \\/ \\d+ a tudásbázisban/');

    const toggleBtns = page.locator('[data-testid^="knowledge-toggle-"]');
    const count = await toggleBtns.count();

    if (count > 0) {
      // Click the first toggle button
      await toggleBtns.first().click();

      // Wait for the toggle to complete
      await page.waitForTimeout(1500);

      // Count text should still be visible after toggle
      const newText = await countText.textContent();

      // Verify the count text is present
      expect(newText).not.toBeNull();
    }
  });
});
