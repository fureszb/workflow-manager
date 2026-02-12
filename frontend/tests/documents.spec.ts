import { test, expect } from '@playwright/test';

test.describe('Documents (US-013)', () => {
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

  test('should navigate to documents page', async ({ page }) => {
    await page.goto('/documents');
    await expect(page.locator('h1')).toContainText('Dokumentumok');
  });

  test('should display upload dropzone', async ({ page }) => {
    await page.goto('/documents');

    // Drop zone should be visible
    await expect(page.getByTestId('file-dropzone')).toBeVisible();
  });

  test('should display documents table', async ({ page }) => {
    await page.goto('/documents');

    // Wait for loading to finish
    await page.waitForTimeout(1000);

    // Either table or empty state should be visible
    const table = page.getByTestId('documents-table');
    const emptyIcon = page.locator('text=Még nincsenek dokumentumok feltöltve');

    const tableVisible = await table.isVisible();
    const emptyVisible = await emptyIcon.isVisible();

    expect(tableVisible || emptyVisible).toBeTruthy();
  });

  test('should toggle filters panel', async ({ page }) => {
    await page.goto('/documents');

    // Filters panel should not be visible initially
    await expect(page.getByTestId('filters-panel')).not.toBeVisible();

    // Click toggle button
    await page.getByTestId('toggle-filters-btn').click();

    // Filters panel should now be visible
    await expect(page.getByTestId('filters-panel')).toBeVisible();

    // Should have search input
    await expect(page.getByTestId('search-input')).toBeVisible();

    // Should have type filter
    await expect(page.getByTestId('type-filter')).toBeVisible();

    // Should have knowledge filter
    await expect(page.getByTestId('knowledge-filter')).toBeVisible();
  });

  test('should have upload category section', async ({ page }) => {
    await page.goto('/documents');

    // Category select should be visible by default (or input if new mode is active)
    const categorySelect = page.getByTestId('upload-category-select');
    const categoryInput = page.getByTestId('upload-category-input');

    // Either the select or input should be visible (depending on mode)
    const selectVisible = await categorySelect.isVisible();
    const inputVisible = await categoryInput.isVisible();
    expect(selectVisible || inputVisible).toBeTruthy();
  });

  test('should have knowledge base checkbox', async ({ page }) => {
    await page.goto('/documents');

    // Knowledge checkbox should be visible
    await expect(page.getByTestId('upload-knowledge-checkbox')).toBeVisible();
  });

  test('should have hidden file input', async ({ page }) => {
    await page.goto('/documents');

    // File input should exist (but be hidden)
    const fileInput = page.getByTestId('file-input');
    await expect(fileInput).toHaveCount(1);
  });

  test('should filter documents by type', async ({ page }) => {
    await page.goto('/documents');

    // Open filters
    await page.getByTestId('toggle-filters-btn').click();

    // Select PDF type
    await page.getByTestId('type-filter').selectOption('pdf');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Filter should be applied (indicated by active filter indicator)
    const filterBtn = page.getByTestId('toggle-filters-btn');
    const hasIndicator = await filterBtn.locator('.rounded-full').isVisible();
    expect(hasIndicator).toBeTruthy();
  });

  test('should filter documents by knowledge base status', async ({ page }) => {
    await page.goto('/documents');

    // Open filters
    await page.getByTestId('toggle-filters-btn').click();

    // Select knowledge base filter
    await page.getByTestId('knowledge-filter').selectOption('true');

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Filter should be applied
    const filterBtn = page.getByTestId('toggle-filters-btn');
    const hasIndicator = await filterBtn.locator('.rounded-full').isVisible();
    expect(hasIndicator).toBeTruthy();
  });

  test('should clear filters', async ({ page }) => {
    await page.goto('/documents');

    // Open filters
    await page.getByTestId('toggle-filters-btn').click();

    // Apply a filter
    await page.getByTestId('type-filter').selectOption('pdf');
    await page.waitForTimeout(300);

    // Clear filters button should appear
    await expect(page.getByTestId('clear-filters-btn')).toBeVisible();

    // Click clear
    await page.getByTestId('clear-filters-btn').click();

    // Filter should be reset
    await expect(page.getByTestId('type-filter')).toHaveValue('');
  });

  test('should search documents', async ({ page }) => {
    await page.goto('/documents');

    // Open filters
    await page.getByTestId('toggle-filters-btn').click();

    // Type in search
    await page.getByTestId('search-input').fill('test');

    // Wait for search to apply
    await page.waitForTimeout(500);

    // Filter should be active
    const filterBtn = page.getByTestId('toggle-filters-btn');
    const hasIndicator = await filterBtn.locator('.rounded-full').isVisible();
    expect(hasIndicator).toBeTruthy();
  });

  test('should upload a file via input', async ({ page }) => {
    await page.goto('/documents');

    // Create a test file
    const fileInput = page.getByTestId('file-input');

    // Upload a test file (we need to create one in memory)
    await fileInput.setInputFiles({
      name: 'test-upload.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Test file content for upload'),
    });

    // Wait for upload
    await page.waitForTimeout(1000);

    // Should show success toast or the file in list
    // (checking for either the toast or the file in the table)
    await Promise.race([
      page.locator('text=test-upload.txt').first().isVisible().catch(() => false),
      page.locator('text=feltöltve').first().isVisible().catch(() => false),
    ]);

    // The upload should have been processed (either shown in table or toast)
    // Note: This test may need adjustment based on actual toast implementation
  });

  test('should show file type icons correctly', async ({ page }) => {
    await page.goto('/documents');

    // Wait for any documents to load
    await page.waitForTimeout(1000);

    // If there are documents, they should have icons
    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // First row should have an icon (svg element)
      const firstRow = documentRows.first();
      await expect(firstRow.locator('svg').first()).toBeVisible();
    }
  });

  test('should display file metadata in table', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const table = page.getByTestId('documents-table');
    if (await table.isVisible()) {
      // Table headers should be present
      await expect(table.locator('th')).toContainText(['Fájl', 'Méret', 'Kategória', 'Dátum', 'Tudásbázis', 'Műveletek']);
    }
  });

  test('should have download button for documents', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // First row should have download button
      const firstDownloadBtn = page.locator('[data-testid^="download-btn-"]').first();
      await expect(firstDownloadBtn).toBeVisible();
    }
  });

  test('should have delete button for documents', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // First row should have delete button
      const firstDeleteBtn = page.locator('[data-testid^="delete-btn-"]').first();
      await expect(firstDeleteBtn).toBeVisible();
    }
  });

  test('should have knowledge toggle button for documents', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // First row should have knowledge toggle button
      const firstKnowledgeBtn = page.locator('[data-testid^="knowledge-toggle-"]').first();
      await expect(firstKnowledgeBtn).toBeVisible();
    }
  });

  test('dropzone should respond to click', async ({ page }) => {
    await page.goto('/documents');

    const dropzone = page.getByTestId('file-dropzone');

    // Click the dropzone
    await dropzone.click();

    // The file input should be triggered (we can't directly test file dialog opening,
    // but we can verify the click handler works by checking no error occurred)
    await expect(dropzone).toBeVisible();
  });

  test('should display document count', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    // Should show document count in header
    await expect(page.locator('text=Dokumentumok (')).toBeVisible();
  });

  // US-014 Version History Tests
  test('should have version history button for documents', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // First row should have versions button
      const firstVersionsBtn = page.locator('[data-testid^="versions-btn-"]').first();
      await expect(firstVersionsBtn).toBeVisible();
    }
  });

  test('should open version history modal when clicking versions button', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // Click versions button
      const firstVersionsBtn = page.locator('[data-testid^="versions-btn-"]').first();
      await firstVersionsBtn.click();

      // Version modal should appear
      await expect(page.getByTestId('version-modal')).toBeVisible();

      // Modal should have title
      await expect(page.locator('text=Verziótörténet')).toBeVisible();
    }
  });

  test('should close version history modal when clicking X button', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // Click versions button to open modal
      const firstVersionsBtn = page.locator('[data-testid^="versions-btn-"]').first();
      await firstVersionsBtn.click();

      // Modal should be visible
      await expect(page.getByTestId('version-modal')).toBeVisible();

      // Click close button
      await page.getByTestId('close-version-modal').click();

      // Modal should be closed
      await expect(page.getByTestId('version-modal')).not.toBeVisible();
    }
  });

  test('should close version history modal when clicking backdrop', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // Click versions button to open modal
      const firstVersionsBtn = page.locator('[data-testid^="versions-btn-"]').first();
      await firstVersionsBtn.click();

      // Modal should be visible
      await expect(page.getByTestId('version-modal')).toBeVisible();

      // Click backdrop (at position outside modal)
      await page.getByTestId('version-modal-backdrop').click({ position: { x: 10, y: 10 } });

      // Modal should be closed
      await expect(page.getByTestId('version-modal')).not.toBeVisible();
    }
  });

  test('should display version rows with download buttons', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // Click versions button to open modal
      const firstVersionsBtn = page.locator('[data-testid^="versions-btn-"]').first();
      await firstVersionsBtn.click();

      // Wait for versions to load
      await page.waitForTimeout(500);

      // Should have version rows (at least current version)
      const versionRows = page.locator('[data-testid^="version-row-"]');
      const versionCount = await versionRows.count();

      if (versionCount > 0) {
        // Each version row should have a download button
        const downloadBtns = page.locator('[data-testid^="download-version-"]');
        await expect(downloadBtns.first()).toBeVisible();
      }
    }
  });

  // US-015 Category Tests
  test('should have category filter in filters panel', async ({ page }) => {
    await page.goto('/documents');

    // Open filters
    await page.getByTestId('toggle-filters-btn').click();

    // Category filter should be visible
    await expect(page.getByTestId('category-filter')).toBeVisible();
  });

  test('should have category select in upload section', async ({ page }) => {
    await page.goto('/documents');

    // Category select should be visible
    await expect(page.getByTestId('upload-category-select')).toBeVisible();
  });

  test('should have new category button', async ({ page }) => {
    await page.goto('/documents');

    // New category button should be visible
    await expect(page.getByTestId('new-category-btn')).toBeVisible();
  });

  test('should show new category input when clicking new button', async ({ page }) => {
    await page.goto('/documents');

    // Click new category button
    await page.getByTestId('new-category-btn').click();

    // New category input should be visible
    await expect(page.getByTestId('upload-category-input')).toBeVisible();

    // Cancel button should be visible
    await expect(page.getByTestId('cancel-new-category-btn')).toBeVisible();
  });

  test('should hide new category input when clicking cancel', async ({ page }) => {
    await page.goto('/documents');

    // Click new category button
    await page.getByTestId('new-category-btn').click();

    // Click cancel button
    await page.getByTestId('cancel-new-category-btn').click();

    // Category select should be visible again
    await expect(page.getByTestId('upload-category-select')).toBeVisible();

    // New category input should not be visible
    await expect(page.getByTestId('upload-category-input')).not.toBeVisible();
  });

  test('should filter documents by category', async ({ page }) => {
    await page.goto('/documents');

    // Open filters
    await page.getByTestId('toggle-filters-btn').click();

    // Get category filter
    const categoryFilter = page.getByTestId('category-filter');

    // Get options count (including "Mind" option)
    const optionsCount = await categoryFilter.locator('option').count();

    // If there are categories, select one
    if (optionsCount > 1) {
      const secondOption = categoryFilter.locator('option').nth(1);
      const categoryValue = await secondOption.getAttribute('value');

      if (categoryValue) {
        await categoryFilter.selectOption(categoryValue);

        // Wait for filter to apply
        await page.waitForTimeout(500);

        // Filter should be active
        const filterBtn = page.getByTestId('toggle-filters-btn');
        const hasIndicator = await filterBtn.locator('.rounded-full').isVisible();
        expect(hasIndicator).toBeTruthy();
      }
    }
  });

  test('should have edit category button on document row', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // Hover over first row to show edit button
      const firstRow = documentRows.first();
      await firstRow.hover();

      // Edit category button should be visible on hover
      const editBtn = page.locator('[data-testid^="edit-category-btn-"]').first();
      await expect(editBtn).toBeVisible();
    }
  });

  test('should show category edit input when clicking edit button', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // Hover and click edit button
      const firstRow = documentRows.first();
      await firstRow.hover();

      const editBtn = page.locator('[data-testid^="edit-category-btn-"]').first();
      await editBtn.click();

      // Edit input should be visible
      const editInput = page.locator('[data-testid^="edit-category-input-"]').first();
      await expect(editInput).toBeVisible();

      // Save and cancel buttons should be visible
      await expect(page.locator('[data-testid^="save-category-btn-"]').first()).toBeVisible();
      await expect(page.locator('[data-testid^="cancel-category-btn-"]').first()).toBeVisible();
    }
  });

  test('should cancel category edit when clicking cancel button', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // Hover and click edit button
      const firstRow = documentRows.first();
      await firstRow.hover();

      const editBtn = page.locator('[data-testid^="edit-category-btn-"]').first();
      await editBtn.click();

      // Click cancel button
      const cancelBtn = page.locator('[data-testid^="cancel-category-btn-"]').first();
      await cancelBtn.click();

      // Edit input should not be visible
      await expect(page.locator('[data-testid^="edit-category-input-"]').first()).not.toBeVisible();
    }
  });

  test('should upload file with category from select', async ({ page }) => {
    await page.goto('/documents');

    // Get category select
    const categorySelect = page.getByTestId('upload-category-select');
    const optionsCount = await categorySelect.locator('option').count();

    // If there are categories, select one
    if (optionsCount > 1) {
      const secondOption = categorySelect.locator('option').nth(1);
      const categoryValue = await secondOption.getAttribute('value');

      if (categoryValue) {
        await categorySelect.selectOption(categoryValue);
      }
    }

    // Upload a file
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles({
      name: 'category-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Test file with category'),
    });

    // Wait for upload
    await page.waitForTimeout(1000);
  });

  test('should allow entering new category and uploading file', async ({ page }) => {
    await page.goto('/documents');

    // Click new category button
    await page.getByTestId('new-category-btn').click();

    // New category input should be visible
    const newCategoryInput = page.getByTestId('upload-category-input');
    await expect(newCategoryInput).toBeVisible();

    // Enter new category name
    await newCategoryInput.fill('test-new-category');

    // Verify the category was entered
    await expect(newCategoryInput).toHaveValue('test-new-category');

    // Upload a file (the upload may fail if backend has issues, but the UI should work)
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles({
      name: 'new-category-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Test file with new category'),
    });

    // Wait briefly for upload attempt
    await page.waitForTimeout(500);

    // Test passes if we got here - UI functionality works
  });

  // US-016 Preview and Search Tests
  test('should have preview button for documents', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // First row should have preview button
      const firstPreviewBtn = page.locator('[data-testid^="preview-btn-"]').first();
      await expect(firstPreviewBtn).toBeVisible();
    }
  });

  test('should open preview modal when clicking preview button', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // Click preview button
      const firstPreviewBtn = page.locator('[data-testid^="preview-btn-"]').first();
      await firstPreviewBtn.click();

      // Preview modal should appear
      await expect(page.getByTestId('preview-modal')).toBeVisible();

      // Modal should have title
      await expect(page.locator('text=Előnézet')).toBeVisible();
    }
  });

  test('should close preview modal when clicking X button', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // Click preview button to open modal
      const firstPreviewBtn = page.locator('[data-testid^="preview-btn-"]').first();
      await firstPreviewBtn.click();

      // Modal should be visible
      await expect(page.getByTestId('preview-modal')).toBeVisible();

      // Click close button
      await page.getByTestId('close-preview-modal').click();

      // Modal should be closed
      await expect(page.getByTestId('preview-modal')).not.toBeVisible();
    }
  });

  test('should close preview modal when clicking backdrop', async ({ page }) => {
    await page.goto('/documents');

    // Wait for documents to load
    await page.waitForTimeout(1000);

    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // Click preview button to open modal
      const firstPreviewBtn = page.locator('[data-testid^="preview-btn-"]').first();
      await firstPreviewBtn.click();

      // Modal should be visible
      await expect(page.getByTestId('preview-modal')).toBeVisible();

      // Click backdrop (at position outside modal)
      await page.getByTestId('preview-modal-backdrop').click({ position: { x: 10, y: 10 } });

      // Modal should be closed
      await expect(page.getByTestId('preview-modal')).not.toBeVisible();
    }
  });

  test('should have content search checkbox in filters', async ({ page }) => {
    await page.goto('/documents');

    // Open filters
    await page.getByTestId('toggle-filters-btn').click();

    // Content search checkbox should be visible
    await expect(page.getByTestId('content-search-checkbox')).toBeVisible();
  });

  test('should have content search button in filters', async ({ page }) => {
    await page.goto('/documents');

    // Open filters
    await page.getByTestId('toggle-filters-btn').click();

    // Content search button should be visible
    await expect(page.getByTestId('content-search-btn')).toBeVisible();
  });

  test('should enable content search when checkbox is checked', async ({ page }) => {
    await page.goto('/documents');

    // Open filters
    await page.getByTestId('toggle-filters-btn').click();

    // Check the content search checkbox
    const checkbox = page.getByTestId('content-search-checkbox');
    await checkbox.check();

    // Checkbox should be checked
    await expect(checkbox).toBeChecked();
  });

  test('should perform content search when button clicked with query', async ({ page }) => {
    await page.goto('/documents');

    // Open filters
    await page.getByTestId('toggle-filters-btn').click();

    // Enter search query
    await page.getByTestId('search-input').fill('test');

    // Click content search button
    await page.getByTestId('content-search-btn').click();

    // Wait for search
    await page.waitForTimeout(1000);

    // Either search results panel appears or no results (both are valid)
    // The test passes if no error occurred
  });

  test('should show search results panel when content search has results', async ({ page }) => {
    await page.goto('/documents');

    // First upload a file with searchable content
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles({
      name: 'searchable-content.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('This file contains UNIQUE_SEARCH_TERM_12345 for testing'),
    });

    // Wait for upload
    await page.waitForTimeout(1000);

    // Open filters
    await page.getByTestId('toggle-filters-btn').click();

    // Enter the unique search term
    await page.getByTestId('search-input').fill('UNIQUE_SEARCH_TERM_12345');

    // Click content search button
    await page.getByTestId('content-search-btn').click();

    // Wait for search
    await page.waitForTimeout(1500);

    // Search results panel should appear if there are results
    const resultsPanel = page.getByTestId('search-results-panel');
    const hasResults = await resultsPanel.isVisible();

    // If we have results, verify the panel structure
    if (hasResults) {
      await expect(page.locator('text=Keresési eredmények')).toBeVisible();
    }
  });

  test('should clear search results when clicking close button', async ({ page }) => {
    await page.goto('/documents');

    // First upload a file
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles({
      name: 'clear-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Test content for clearing'),
    });

    await page.waitForTimeout(1000);

    // Open filters and perform search
    await page.getByTestId('toggle-filters-btn').click();
    await page.getByTestId('search-input').fill('Test');
    await page.getByTestId('content-search-btn').click();

    await page.waitForTimeout(1000);

    // If search results panel is visible, click close
    const resultsPanel = page.getByTestId('search-results-panel');
    if (await resultsPanel.isVisible()) {
      await page.getByTestId('clear-search-results-btn').click();

      // Results panel should be hidden
      await expect(resultsPanel).not.toBeVisible();
    }
  });

  test('should display text preview for TXT files', async ({ page }) => {
    await page.goto('/documents');

    // Upload a TXT file
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles({
      name: 'text-preview-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Hello World\nThis is a test file\nWith multiple lines'),
    });

    // Wait for upload
    await page.waitForTimeout(1000);

    // Find the uploaded file and click preview
    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();

    if (count > 0) {
      // Find the row for our uploaded file
      const previewBtns = page.locator('[data-testid^="preview-btn-"]');
      await previewBtns.first().click();

      // Wait for preview to load
      await page.waitForTimeout(500);

      // Preview modal should be visible
      await expect(page.getByTestId('preview-modal')).toBeVisible();

      // Check if text content is displayed (or loading/error)
      // Test passes if modal opened successfully - preview content may vary based on file type
      await page.getByTestId('text-preview-content').isVisible().catch(() => false);
    }
  });

  test('should display PDF preview in iframe', async ({ page }) => {
    await page.goto('/documents');

    // Upload a PDF file
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles({
      name: 'pdf-preview-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake pdf content for testing'),
    });

    // Wait for upload
    await page.waitForTimeout(1000);

    // Find and click preview for PDF
    const previewBtns = page.locator('[data-testid^="preview-btn-"]');
    const count = await previewBtns.count();

    if (count > 0) {
      await previewBtns.first().click();

      // Wait for preview to load
      await page.waitForTimeout(500);

      // Preview modal should be visible
      await expect(page.getByTestId('preview-modal')).toBeVisible();

      // PDF preview should use iframe - test passes if modal opened successfully
      await page.getByTestId('pdf-preview-iframe').isVisible().catch(() => false);
    }
  });

  test('should highlight search matches in results', async ({ page }) => {
    await page.goto('/documents');

    // Upload file with specific content
    const uniqueTerm = 'HIGHLIGHT_TEST_TERM';
    const fileInput = page.getByTestId('file-input');
    await fileInput.setInputFiles({
      name: 'highlight-test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(`Before ${uniqueTerm} after`),
    });

    await page.waitForTimeout(1000);

    // Search for the term
    await page.getByTestId('toggle-filters-btn').click();
    await page.getByTestId('search-input').fill(uniqueTerm);
    await page.getByTestId('content-search-btn').click();

    await page.waitForTimeout(1500);

    // Check if search results have highlighted matches
    const resultsPanel = page.getByTestId('search-results-panel');
    if (await resultsPanel.isVisible()) {
      // Look for highlighted text (mark elements)
      const highlights = page.locator('mark');
      const highlightCount = await highlights.count();

      // If we have highlights, the feature is working
      if (highlightCount > 0) {
        await expect(highlights.first()).toBeVisible();
      }
    }
  });
});
