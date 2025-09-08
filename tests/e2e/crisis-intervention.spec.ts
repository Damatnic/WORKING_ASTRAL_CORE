import { test, expect } from '@playwright/test';

test.describe('Crisis Intervention Features - CRITICAL', () => {
  
  test('Emergency contact links work correctly', async ({ page }) => {
    await page.goto('/crisis');
    
    // Test 988 emergency link
    const link988 = page.locator('a[href="tel:988"]');
    await expect(link988).toBeVisible();
    await expect(link988).toHaveText(/988/);
    
    // Test Crisis Text Line
    const textLink = page.locator('a[href="sms:741741&body=HOME"]');
    await expect(textLink).toBeVisible();
    await expect(textLink).toHaveText(/741741/);
    
    // Test 911 emergency link
    const link911 = page.locator('a[href="tel:911"]');
    await expect(link911).toBeVisible();
    await expect(link911).toHaveText(/911/);
  });

  test('Crisis page loads quickly', async ({ page }) => {
    const start = Date.now();
    await page.goto('/crisis');
    const loadTime = Date.now() - start;
    
    expect(loadTime).toBeLessThan(3000); // Must load in under 3 seconds
    await expect(page.locator('h1')).toContainText(/Crisis/);
  });

  test('Safety plan builder functionality', async ({ page }) => {
    await page.goto('/crisis/safety-plan');
    
    // Add warning sign
    await page.click('button:has-text("Add Warning Sign")');
    const warningInput = page.locator('input[placeholder*="warning sign"]').first();
    await warningInput.fill('Feeling hopeless');
    
    // Add coping strategy
    await page.click('button:has-text("Add Coping Strategy")');
    const copingInput = page.locator('input[placeholder*="coping strategy"]').first();
    await copingInput.fill('Call a friend');
    
    // Add support contact
    await page.click('button:has-text("Add Support Contact")');
    await page.fill('input[placeholder*="Name"]', 'John Doe');
    await page.fill('input[type="tel"]', '555-1234');
    await page.fill('input[placeholder*="Relationship"]', 'Best Friend');
    
    // Save safety plan
    await page.click('button:has-text("Save Safety Plan")');
    
    // Verify data persists after reload
    await page.reload();
    await expect(warningInput).toHaveValue('Feeling hopeless');
    await expect(copingInput).toHaveValue('Call a friend');
  });

  test('Crisis navigation accessibility', async ({ page }) => {
    await page.goto('/crisis');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Check for skip links and ARIA labels
    await expect(page.locator('.sr-only')).toBeVisible();
  });
});