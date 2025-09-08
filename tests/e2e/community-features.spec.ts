import { test, expect } from '@playwright/test';

test.describe('Community Features - MEDIUM PRIORITY', () => {
  
  test('Support groups page functionality', async ({ page }) => {
    await page.goto('/community/groups');
    
    // Test search functionality
    await page.fill('input[placeholder*="Search groups"]', 'anxiety');
    await expect(page.locator('[data-testid="group-card"]')).toContainText(/Anxiety/);
    
    // Test category filtering
    await page.selectOption('select', 'anxiety');
    await expect(page.locator('[data-testid="group-card"]').first()).toContainText(/Anxiety/);
    
    // Test group type filtering
    await page.selectOption('select[data-testid="type-filter"]', 'public');
    
    // Test join group button
    const joinButton = page.locator('button:has-text("Join Group")').first();
    await expect(joinButton).toBeVisible();
    await joinButton.click();
    
    // Verify modal or navigation occurs
    await expect(page.locator('.modal, .dialog')).toBeVisible();
  });

  test('Forums page interaction', async ({ page }) => {
    await page.goto('/community/forums');
    
    // Test forum category navigation
    await page.click('a[href*="/community/forums/general"]');
    // Should navigate or show forum details
    
    // Test search
    await page.fill('input[placeholder*="Search forums"]', 'depression');
    await expect(page.locator('.forum-item')).toContainText(/Depression/);
    
    // Test sort functionality
    await page.selectOption('select[data-testid="sort-select"]', 'popular');
  });

  test('Community page crisis safety', async ({ page }) => {
    await page.goto('/community');
    
    // Ensure crisis support is always visible
    await expect(page.locator('a[href="tel:988"]')).toBeVisible();
    await expect(page.locator('a[href="/crisis"]')).toBeVisible();
    
    // Test crisis banner functionality
    await page.click('a[href="/crisis"]');
    await expect(page).toHaveURL(/crisis/);
  });

  test('Community responsive navigation', async ({ page, isMobile }) => {
    await page.goto('/community');
    
    if (isMobile) {
      // Test mobile navigation
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }
    
    // Test breadcrumb navigation
    await page.click('a[href="/community/groups"]');
    await page.click('[data-testid="back-to-community"]');
    await expect(page).toHaveURL('/community');
  });
});