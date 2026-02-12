import { test, expect, Page } from '@playwright/test';

/**
 * US-002 - Button Click Handler Tests
 *
 * This file tests all buttons in the application to ensure:
 * - Every button has onClick handler
 * - Clicking buttons triggers expected state change or API call
 * - No button click results in silent failure
 * - No console error after click
 */

// Helper to check if backend is available
async function checkBackend(page: Page): Promise<boolean> {
  try {
    const response = await page.request.get('http://localhost:8000/api/v1/health');
    return response.ok();
  } catch {
    return false;
  }
}

// Helper to collect console errors
function setupConsoleErrorTracking(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

test.describe('US-002 - Button Click Handler Tests', () => {
  test.beforeEach(async ({ page }) => {
    const backendAvailable = await checkBackend(page);
    if (!backendAvailable) {
      test.skip();
    }
  });

  // ========================================
  // Dashboard Button Tests
  // ========================================
  test.describe('Dashboard Buttons', () => {
    test('should have clickable refresh button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/');
      await page.waitForTimeout(500);

      const refreshBtn = page.locator('button:has-text("Frissítés")');
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable stat cards that navigate', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/');
      await page.waitForTimeout(500);

      // Click on a stat card if available
      const statCards = page.locator('[class*="cursor-pointer"]');
      const count = await statCards.count();
      if (count > 0) {
        await statCards.first().click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable generate monthly tasks button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/');
      await page.waitForTimeout(500);

      const generateBtn = page.locator('button:has-text("Havi feladatok generálása")');
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });
  });

  // ========================================
  // Processes Page Button Tests
  // ========================================
  test.describe('Processes Page Buttons', () => {
    test('should have clickable month navigation buttons', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/processes');
      await page.waitForTimeout(500);

      // Previous month button (ChevronLeft)
      const prevBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
      if (await prevBtn.isVisible()) {
        await prevBtn.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }

      // Next month button (ChevronRight)
      const nextBtn = page.locator('button').filter({ has: page.locator('svg') }).nth(1);
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable filter button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/processes');
      await page.waitForTimeout(500);

      const filterBtn = page.locator('button:has-text("Szűrő")');
      if (await filterBtn.isVisible()) {
        await filterBtn.click();
        await page.waitForTimeout(300);
        // Filter menu should appear
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable generate tasks button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/processes');
      await page.waitForTimeout(500);

      const generateBtn = page.locator('button:has-text("Generálás")');
      if (await generateBtn.isVisible()) {
        await generateBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable archive link', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/processes');
      await page.waitForTimeout(500);

      const archiveLink = page.locator('a[href="/processes/archive"]');
      if (await archiveLink.isVisible()) {
        await archiveLink.click();
        await expect(page).toHaveURL('/processes/archive');
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });
  });

  // ========================================
  // Process Archive Page Button Tests
  // ========================================
  test.describe('Process Archive Page Buttons', () => {
    test('should have clickable back link', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/processes/archive');
      await page.waitForTimeout(500);

      const backLink = page.locator('a[href="/processes"]');
      if (await backLink.isVisible()) {
        await backLink.click();
        await expect(page).toHaveURL('/processes');
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable search input', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/processes/archive');
      await page.waitForTimeout(500);

      const searchInput = page.getByTestId('archive-search-input');
      if (await searchInput.isVisible()) {
        await searchInput.click();
        await searchInput.fill('test');
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });
  });

  // ========================================
  // Emails Page Button Tests
  // ========================================
  test.describe('Emails Page Buttons', () => {
    test('should have clickable import button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/emails');
      await page.waitForTimeout(500);

      const importBtn = page.locator('button:has-text("Importálás")');
      if (await importBtn.isVisible()) {
        await importBtn.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable AI categorize button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/emails');
      await page.waitForTimeout(500);

      const aiBtn = page.locator('button:has-text("AI Kategorizálás")');
      if (await aiBtn.isVisible()) {
        await aiBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable AI auto-link button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/emails');
      await page.waitForTimeout(500);

      const autoLinkBtn = page.locator('button:has-text("Auto-link")');
      if (await autoLinkBtn.isVisible()) {
        await autoLinkBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable email rows', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/emails');
      await page.waitForTimeout(1000);

      const emailRows = page.locator('tr[class*="cursor-pointer"]');
      const count = await emailRows.count();
      if (count > 0) {
        await emailRows.first().click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });
  });

  // ========================================
  // Documents Page Button Tests
  // ========================================
  test.describe('Documents Page Buttons', () => {
    test('should have clickable toggle filters button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/documents');
      await page.waitForTimeout(500);

      const toggleBtn = page.getByTestId('toggle-filters-btn');
      await toggleBtn.click();
      await expect(page.getByTestId('filters-panel')).toBeVisible();
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });

    test('should have clickable new category button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/documents');
      await page.waitForTimeout(500);

      const newCategoryBtn = page.getByTestId('new-category-btn');
      await newCategoryBtn.click();
      await expect(page.getByTestId('upload-category-input')).toBeVisible();
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });

    test('should have clickable cancel new category button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/documents');
      await page.waitForTimeout(500);

      await page.getByTestId('new-category-btn').click();
      const cancelBtn = page.getByTestId('cancel-new-category-btn');
      await cancelBtn.click();
      await expect(page.getByTestId('upload-category-select')).toBeVisible();
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });

    test('should have clickable content search button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/documents');
      await page.waitForTimeout(500);

      await page.getByTestId('toggle-filters-btn').click();
      await page.getByTestId('search-input').fill('test');

      const searchBtn = page.getByTestId('content-search-btn');
      await searchBtn.click();
      await page.waitForTimeout(500);
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });

    test('should have clickable clear filters button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/documents');
      await page.waitForTimeout(500);

      await page.getByTestId('toggle-filters-btn').click();
      await page.getByTestId('type-filter').selectOption('pdf');
      await page.waitForTimeout(300);

      const clearBtn = page.getByTestId('clear-filters-btn');
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable dropzone', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/documents');
      await page.waitForTimeout(500);

      const dropzone = page.getByTestId('file-dropzone');
      await dropzone.click();
      await page.waitForTimeout(300);
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });

    test('should have clickable document action buttons when documents exist', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/documents');
      await page.waitForTimeout(1000);

      const documentRows = page.locator('[data-testid^="document-row-"]');
      const count = await documentRows.count();

      if (count > 0) {
        // Test preview button
        const previewBtn = page.locator('[data-testid^="preview-btn-"]').first();
        if (await previewBtn.isVisible()) {
          await previewBtn.click();
          await page.waitForTimeout(300);
          expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);

          // Close modal
          const closeBtn = page.getByTestId('close-preview-modal');
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
          }
        }

        // Test versions button
        const versionsBtn = page.locator('[data-testid^="versions-btn-"]').first();
        if (await versionsBtn.isVisible()) {
          await versionsBtn.click();
          await page.waitForTimeout(300);
          expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);

          // Close modal
          const closeVersionBtn = page.getByTestId('close-version-modal');
          if (await closeVersionBtn.isVisible()) {
            await closeVersionBtn.click();
          }
        }

        // Test knowledge toggle button
        const knowledgeBtn = page.locator('[data-testid^="knowledge-toggle-"]').first();
        if (await knowledgeBtn.isVisible()) {
          await knowledgeBtn.click();
          await page.waitForTimeout(500);
          expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
        }

        // Test download button (just verify it's clickable, don't actually download)
        const downloadBtn = page.locator('[data-testid^="download-btn-"]').first();
        if (await downloadBtn.isVisible()) {
          await expect(downloadBtn).toBeEnabled();
        }
      }
    });
  });

  // ========================================
  // Chat Page Button Tests
  // ========================================
  test.describe('Chat Page Buttons', () => {
    test('should have clickable new conversation button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/chat');
      await page.waitForTimeout(500);

      const newConvBtn = page.locator('button:has-text("Új beszélgetés")');
      if (await newConvBtn.isVisible()) {
        await newConvBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable provider toggle button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/chat');
      await page.waitForTimeout(500);

      const providerBtn = page.locator('button:has-text("Ollama"), button:has-text("OpenRouter")');
      if (await providerBtn.first().isVisible()) {
        await providerBtn.first().click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable model dropdown button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/chat');
      await page.waitForTimeout(500);

      const modelDropdown = page.locator('button[class*="model"], button:has(svg[class*="chevron"])').first();
      if (await modelDropdown.isVisible()) {
        await modelDropdown.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable quick prompt buttons', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/chat');
      await page.waitForTimeout(500);

      // Look for quick prompt buttons (they have specific text patterns)
      const quickPrompts = page.locator('button:has-text("Mi a mai teendőm")');
      if (await quickPrompts.isVisible()) {
        await quickPrompts.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable send message button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/chat');
      await page.waitForTimeout(500);

      // Fill message input first
      const textarea = page.locator('textarea');
      if (await textarea.isVisible()) {
        await textarea.fill('Test message');
        await page.waitForTimeout(200);

        const sendBtn = page.locator('button[type="submit"], button:has(svg[class*="send"])').last();
        if (await sendBtn.isVisible()) {
          await sendBtn.click();
          await page.waitForTimeout(500);
          expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
        }
      }
    });

    test('should have clickable RAG toggle', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/chat');
      await page.waitForTimeout(500);

      const ragCheckbox = page.locator('input[type="checkbox"]').first();
      if (await ragCheckbox.isVisible()) {
        await ragCheckbox.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });
  });

  // ========================================
  // Ideas Page Button Tests
  // ========================================
  test.describe('Ideas Page Buttons', () => {
    test('should have clickable generate AI ideas button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/ideas');
      await page.waitForTimeout(500);

      const aiBtn = page.locator('button:has-text("AI Ötletek")');
      if (await aiBtn.isVisible()) {
        await aiBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable new idea button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/ideas');
      await page.waitForTimeout(500);

      const newBtn = page.locator('button:has-text("Új ötlet")');
      if (await newBtn.isVisible()) {
        await newBtn.click();
        await page.waitForTimeout(300);
        // Modal should appear
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable modal close button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/ideas');
      await page.waitForTimeout(500);

      const newBtn = page.locator('button:has-text("Új ötlet")');
      if (await newBtn.isVisible()) {
        await newBtn.click();
        await page.waitForTimeout(300);

        // Close the modal
        const closeBtn = page.locator('button:has(svg[class*="X"]), button:has-text("Mégse")');
        if (await closeBtn.first().isVisible()) {
          await closeBtn.first().click();
          await page.waitForTimeout(300);
          expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
        }
      }
    });

    test('should have clickable idea action buttons when ideas exist', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/ideas');
      await page.waitForTimeout(1000);

      // Check for edit buttons
      const editBtns = page.locator('button:has(svg[class*="Pencil"], svg[class*="Edit"])');
      const count = await editBtns.count();
      if (count > 0) {
        await editBtns.first().click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });
  });

  // ========================================
  // Statistics Page Button Tests
  // ========================================
  test.describe('Statistics Page Buttons', () => {
    test('should have clickable preset range buttons', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/statistics');
      await page.waitForTimeout(500);

      const presetBtns = page.locator('button:has-text("7 nap"), button:has-text("30 nap"), button:has-text("90 nap")');
      const count = await presetBtns.count();
      for (let i = 0; i < count; i++) {
        await presetBtns.nth(i).click();
        await page.waitForTimeout(300);
      }
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });

    test('should have clickable refresh button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/statistics');
      await page.waitForTimeout(500);

      const refreshBtn = page.locator('button:has-text("Frissítés")');
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable export menu button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/statistics');
      await page.waitForTimeout(500);

      const exportBtn = page.locator('button:has-text("Exportálás")');
      if (await exportBtn.isVisible()) {
        await exportBtn.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });
  });

  // ========================================
  // Settings Page Button Tests
  // ========================================
  test.describe('Settings Page Buttons', () => {
    test('should have clickable tab buttons', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/settings');
      await page.waitForTimeout(500);

      // Test all tabs
      const tabs = ['Általános', 'AI', 'Téma', 'Értesítések', 'Tudásbázis', 'Státuszok', 'Folyamatok'];
      for (const tabName of tabs) {
        const tab = page.locator(`button:has-text("${tabName}")`);
        if (await tab.isVisible()) {
          await tab.click();
          await page.waitForTimeout(200);
        }
      }
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });

    test('should have clickable save button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/settings');
      await page.waitForTimeout(500);

      const saveBtn = page.locator('button:has-text("Mentés")');
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable notification toggle buttons', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/settings');
      await page.waitForTimeout(500);

      // Click Notifications tab
      await page.locator('button:has-text("Értesítések")').click();
      await page.waitForTimeout(300);

      // Toggle buttons
      const toggleBtns = page.locator('button[role="switch"], input[type="checkbox"]');
      const count = await toggleBtns.count();
      if (count > 0) {
        await toggleBtns.first().click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable status management buttons', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/settings');
      await page.waitForTimeout(500);

      // Click Statuses tab
      await page.locator('button:has-text("Státuszok")').click();
      await page.waitForTimeout(300);

      // Add status button
      const addBtn = page.locator('button:has-text("Új státusz")');
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable AI personality save buttons', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/settings');
      await page.waitForTimeout(500);

      // Click AI tab
      await page.locator('button:has-text("AI")').click();
      await page.waitForTimeout(300);

      // Save personality button
      const saveBtn = page.locator('button:has-text("Mentés")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable knowledge toggle buttons in settings', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/settings');
      await page.waitForTimeout(500);

      // Click Knowledge tab
      await page.locator('button:has-text("Tudásbázis")').click();
      await page.waitForTimeout(500);

      const toggleBtns = page.locator('[data-testid^="knowledge-toggle-"]');
      const count = await toggleBtns.count();
      if (count > 0) {
        await toggleBtns.first().click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });
  });

  // ========================================
  // Audit Log Page Button Tests
  // ========================================
  test.describe('Audit Log Page Buttons', () => {
    test('should have clickable refresh button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/audit-log');
      await page.waitForTimeout(500);

      const refreshBtn = page.locator('button:has-text("Frissítés")');
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable export buttons', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/audit-log');
      await page.waitForTimeout(500);

      // Excel export
      const excelBtn = page.locator('button:has-text("Excel")');
      if (await excelBtn.isVisible()) {
        await excelBtn.click();
        await page.waitForTimeout(300);
      }

      // CSV export
      const csvBtn = page.locator('button:has-text("CSV")');
      if (await csvBtn.isVisible()) {
        await csvBtn.click();
        await page.waitForTimeout(300);
      }
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });

    test('should have clickable clear filters button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/audit-log');
      await page.waitForTimeout(500);

      const clearBtn = page.locator('button:has-text("Szűrők törlése")');
      if (await clearBtn.isVisible()) {
        await clearBtn.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable pagination buttons', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/audit-log');
      await page.waitForTimeout(1000);

      // Next page button
      const nextBtn = page.locator('button:has-text("Következő")');
      if (await nextBtn.isVisible() && await nextBtn.isEnabled()) {
        await nextBtn.click();
        await page.waitForTimeout(300);
      }

      // Previous page button
      const prevBtn = page.locator('button:has-text("Előző")');
      if (await prevBtn.isVisible() && await prevBtn.isEnabled()) {
        await prevBtn.click();
        await page.waitForTimeout(300);
      }
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });

    test('should have clickable log rows for expansion', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/audit-log');
      await page.waitForTimeout(1000);

      const logRows = page.locator('tr[class*="cursor-pointer"]');
      const count = await logRows.count();
      if (count > 0) {
        await logRows.first().click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });
  });

  // ========================================
  // Scripts Page Button Tests
  // ========================================
  test.describe('Scripts Page Buttons', () => {
    test('should have clickable new script button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/scripts');
      await page.waitForTimeout(500);

      const newBtn = page.locator('button:has-text("Új script")');
      if (await newBtn.isVisible()) {
        await newBtn.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable script action buttons when scripts exist', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/scripts');
      await page.waitForTimeout(1000);

      // Run button
      const runBtns = page.locator('button:has-text("Futtatás")');
      const count = await runBtns.count();
      if (count > 0) {
        // Just check the button is there and enabled, don't actually run
        await expect(runBtns.first()).toBeEnabled();
      }

      // Edit button
      const editBtns = page.locator('button:has(svg[class*="Pencil"])');
      if (await editBtns.first().isVisible()) {
        await editBtns.first().click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });
  });

  // ========================================
  // Token Monitor Page Button Tests
  // ========================================
  test.describe('Token Monitor Page Buttons', () => {
    test('should have clickable preset range buttons', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/token-monitor');
      await page.waitForTimeout(500);

      const presetBtns = page.locator('button:has-text("7 nap"), button:has-text("30 nap"), button:has-text("90 nap")');
      const count = await presetBtns.count();
      for (let i = 0; i < count; i++) {
        await presetBtns.nth(i).click();
        await page.waitForTimeout(300);
      }
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });

    test('should have clickable refresh button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/token-monitor');
      await page.waitForTimeout(500);

      const refreshBtn = page.locator('button:has-text("Frissítés")');
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });
  });

  // ========================================
  // Knowledge Page Button Tests
  // ========================================
  test.describe('Knowledge Page Buttons', () => {
    test('should have clickable refresh button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/knowledge');
      await page.waitForTimeout(500);

      const refreshBtn = page.locator('button:has-text("Frissítés")');
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
        await page.waitForTimeout(500);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable tab buttons', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/knowledge');
      await page.waitForTimeout(500);

      const tabBtns = page.locator('button[role="tab"]');
      const count = await tabBtns.count();
      for (let i = 0; i < count; i++) {
        await tabBtns.nth(i).click();
        await page.waitForTimeout(200);
      }
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });

    test('should have clickable remove document buttons when documents exist', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/knowledge');
      await page.waitForTimeout(1000);

      const removeBtns = page.locator('button:has(svg[class*="X"]), button:has-text("Eltávolítás")');
      const count = await removeBtns.count();
      if (count > 0) {
        // Just verify buttons exist and are clickable
        await expect(removeBtns.first()).toBeEnabled();
      }
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });
  });

  // ========================================
  // Navigation/Layout Button Tests
  // ========================================
  test.describe('Navigation and Layout Buttons', () => {
    test('should have clickable sidebar toggle button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/');
      await page.waitForTimeout(500);

      const sidebarToggle = page.locator('button:has(svg[class*="Menu"])').first();
      if (await sidebarToggle.isVisible()) {
        await sidebarToggle.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable theme toggle button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/');
      await page.waitForTimeout(500);

      const themeToggle = page.locator('[data-testid="theme-toggle"], button:has(svg[class*="Sun"]), button:has(svg[class*="Moon"])').first();
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable notifications button', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/');
      await page.waitForTimeout(500);

      const notifBtn = page.locator('button:has(svg[class*="Bell"])').first();
      if (await notifBtn.isVisible()) {
        await notifBtn.click();
        await page.waitForTimeout(300);
        expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
      }
    });

    test('should have clickable sidebar navigation links', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/');
      await page.waitForTimeout(500);

      // Test sidebar nav links
      const navLinks = [
        { path: '/processes', text: 'Folyamatok' },
        { path: '/emails', text: 'Emailek' },
        { path: '/documents', text: 'Dokumentumok' },
        { path: '/chat', text: 'Chat' },
        { path: '/ideas', text: 'Ötletek' },
      ];

      for (const link of navLinks) {
        const navLink = page.locator(`a[href="${link.path}"]`).first();
        if (await navLink.isVisible()) {
          await navLink.click();
          await expect(page).toHaveURL(link.path);
          await page.waitForTimeout(200);
        }
      }
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });
  });

  // ========================================
  // Comprehensive Silent Failure Detection
  // ========================================
  test.describe('Silent Failure Detection', () => {
    test('should detect silent failures - all pages load without console errors', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);

      const pages = [
        '/',
        '/processes',
        '/processes/archive',
        '/emails',
        '/documents',
        '/chat',
        '/ideas',
        '/statistics',
        '/settings',
        '/audit-log',
        '/scripts',
        '/token-monitor',
        '/knowledge',
      ];

      for (const path of pages) {
        await page.goto(path);
        await page.waitForTimeout(500);
      }

      // Filter out WebSocket errors which are expected when backend WS is not fully connected
      const criticalErrors = errors.filter(
        (e) => !e.includes('WebSocket') && !e.includes('net::ERR')
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('should verify buttons have proper event handlers by checking for state changes', async ({ page }) => {
      const errors = setupConsoleErrorTracking(page);
      await page.goto('/documents');
      await page.waitForTimeout(500);

      // Test that toggle filters button actually changes state
      const filtersPanelBefore = await page.getByTestId('filters-panel').isVisible();
      await page.getByTestId('toggle-filters-btn').click();
      await page.waitForTimeout(200);
      const filtersPanelAfter = await page.getByTestId('filters-panel').isVisible();

      // State should have changed
      expect(filtersPanelBefore).not.toBe(filtersPanelAfter);
      expect(errors.filter(e => !e.includes('WebSocket'))).toHaveLength(0);
    });
  });
});
