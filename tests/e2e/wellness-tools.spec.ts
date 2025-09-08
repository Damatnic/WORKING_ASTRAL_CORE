import { test, expect } from '@playwright/test';

test.describe('Wellness Tools - HIGH PRIORITY', () => {
  
  test('Mood tracker complete workflow', async ({ page }) => {
    await page.goto('/wellness/mood-tracker');
    
    // Select mood (5 = Great)
    await page.click('[data-testid="mood-5"]');
    await expect(page.locator('[data-testid="mood-5"]')).toHaveClass(/scale-105/);
    
    // Select emotions
    await page.click('button:has-text("Happy")');
    await page.click('button:has-text("Grateful")');
    await expect(page.locator('button:has-text("Happy")')).toHaveClass(/bg-wellness-mindful/);
    
    // Select triggers
    await page.click('button:has-text("Exercise")');
    await expect(page.locator('button:has-text("Exercise")')).toHaveClass(/bg-wellness-mindful/);
    
    // Add notes
    await page.fill('textarea[placeholder*="notes"]', 'Had a great workout today!');
    
    // Save entry
    const saveButton = page.locator('button:has-text("Save Entry")');
    await expect(saveButton).not.toBeDisabled();
    await saveButton.click();
    
    // Check for success feedback
    await expect(page.locator('.toast, .notification')).toBeVisible({ timeout: 5000 });
  });

  test('Breathing exercises functionality', async ({ page }) => {
    await page.goto('/wellness/breathing');
    
    // Start 4-7-8 breathing exercise
    await page.click('button:has-text("Start Exercise"):near([data-testid="exercise-4-7-8"])');
    
    // Verify exercise interface appears
    await expect(page.locator('[data-testid="breathing-interface"]')).toBeVisible();
    
    // Test play/pause
    const playButton = page.locator('[data-testid="play-pause-btn"]');
    await playButton.click();
    await expect(playButton).toHaveText(/Pause/);
    
    // Test cycle selection
    await page.selectOption('[data-testid="cycles-select"]', '10');
    
    // Test sound toggle
    await page.click('[data-testid="sound-toggle"]');
    
    // Test reset
    await page.click('[data-testid="reset-btn"]');
    await expect(page.locator('[data-testid="timer-display"]')).toContainText('0');
  });

  test('Wellness page responsive design', async ({ page, isMobile }) => {
    await page.goto('/wellness');
    
    if (isMobile) {
      // Mobile layout checks
      await expect(page.locator('.grid')).toHaveClass(/grid-cols-1/);
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    } else {
      // Desktop layout checks
      await expect(page.locator('.grid')).toHaveClass(/lg:grid-cols-3/);
    }
  });

  test('Wellness navigation and quick actions', async ({ page }) => {
    await page.goto('/wellness');
    
    // Test mood tracker quick access
    await page.click('a[href="/wellness/mood-tracker"]');
    await expect(page).toHaveURL(/mood-tracker/);
    
    // Go back and test breathing exercises
    await page.goBack();
    await page.click('a[href="/wellness/breathing"]');
    await expect(page).toHaveURL(/breathing/);
  });
});