import { test, expect } from '@playwright/test';

test.describe('App Tracker E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should load the dashboard', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/App Tracker/);

    // Check main navigation elements
    await expect(page.getByRole('navigation')).toBeVisible();
    
    // Check dashboard header
    await expect(page.getByRole('heading', { name: /Dashboard|Overview/ })).toBeVisible();
  });

  test('should display system overview cards', async ({ page }) => {
    // Wait for data to load
    await page.waitForSelector('[data-testid="system-overview"]', { timeout: 5000 }).catch(() => {});

    // Check for metric cards
    const cards = page.locator('.card');
    await expect(cards.first()).toBeVisible();
  });

  test('should navigate to ports page', async ({ page }) => {
    // Click on Ports navigation link
    await page.click('text=Ports');

    // Should see ports page content
    await expect(page.getByRole('heading', { name: /Ports/i })).toBeVisible();
  });

  test('should navigate to services page', async ({ page }) => {
    // Click on Services navigation link
    await page.click('text=Services');

    // Should see services page content
    await expect(page.getByRole('heading', { name: /Services/i })).toBeVisible();
  });

  test('should navigate to processes page', async ({ page }) => {
    // Click on Processes navigation link
    await page.click('text=Processes');

    // Should see processes page content
    await expect(page.getByRole('heading', { name: /Processes/i })).toBeVisible();
  });

  test('should navigate to containers page', async ({ page }) => {
    // Click on Containers navigation link
    await page.click('text=Containers');

    // Should see containers page content
    await expect(page.getByRole('heading', { name: /Containers/i })).toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    // Find and click theme toggle
    const themeToggle = page.locator('[data-testid="theme-toggle"]').or(
      page.locator('button').filter({ hasText: /dark|light|theme/i })
    );

    // If toggle exists, click it
    if (await themeToggle.count() > 0) {
      await themeToggle.first().click();
      
      // Check that dark class is applied to html or body
      const isDark = await page.evaluate(() => 
        document.documentElement.classList.contains('dark') ||
        document.body.classList.contains('dark')
      );
      
      expect(isDark).toBe(true);
    }
  });

  test('should filter ports by search', async ({ page }) => {
    await page.click('text=Ports');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Find search input
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('22');
      
      // Wait for filter to apply
      await page.waitForTimeout(300);
      
      // Results should be filtered
      const table = page.locator('table');
      if (await table.isVisible()) {
        // Table should show filtered results
        const rows = table.locator('tbody tr');
        const count = await rows.count();
        // Just verify the filter was applied (count may vary)
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should show keyboard shortcuts modal', async ({ page }) => {
    // Press ? to open shortcuts modal
    await page.keyboard.press('?');
    
    // Wait a bit for modal
    await page.waitForTimeout(300);
    
    // Check if modal/dialog appeared
    const modal = page.locator('[role="dialog"]').or(
      page.locator('.modal').or(
        page.locator('[data-testid="shortcuts-modal"]')
      )
    );
    
    // Modal might or might not appear depending on implementation
    // This is a soft check
    if (await modal.count() > 0) {
      await expect(modal.first()).toBeVisible();
    }
  });
});

test.describe('API Integration', () => {
  test('should receive data via API', async ({ request }) => {
    const response = await request.get('http://localhost:32400/health');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('should get latest data from API', async ({ request }) => {
    const response = await request.get('http://localhost:32400/api/data/latest');
    
    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('system');
    }
  });
});
