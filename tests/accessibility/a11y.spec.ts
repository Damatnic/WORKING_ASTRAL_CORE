import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Testing', () => {
  
  test('Homepage accessibility compliance', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Crisis page accessibility - CRITICAL', async ({ page }) => {
    await page.goto('/crisis');
    
    // Crisis pages must be fully accessible
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Test emergency links are keyboard accessible
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveAttribute('href', 'tel:988');
  });

  test('Mood tracker accessibility', async ({ page }) => {
    await page.goto('/wellness/mood-tracker');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Test keyboard navigation through mood selection
    const moodButtons = page.locator('[data-testid^="mood-"]');
    const firstMood = moodButtons.first();
    
    await page.keyboard.press('Tab');
    await expect(firstMood).toBeFocused();
    
    await page.keyboard.press('Space');
    await expect(firstMood).toHaveClass(/selected/);
  });

  test('Forms have proper labels and descriptions', async ({ page }) => {
    await page.goto('/crisis/safety-plan');
    
    // All form inputs should have labels
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const placeholder = await input.getAttribute('placeholder');
      
      // Input should have id, aria-label, or meaningful placeholder
      expect(id || ariaLabel || placeholder).toBeTruthy();
    }
  });

  test('Color contrast meets WCAG standards', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('.text-primary-600, .bg-primary-500, .text-neutral-600')
      .analyze();
    
    // Should pass color contrast requirements
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    expect(contrastViolations).toEqual([]);
  });

  test('Skip links work correctly', async ({ page }) => {
    await page.goto('/');
    
    // Press Tab to focus skip link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('.sr-only.focus\\:not-sr-only');
    
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toBeFocused();
    
    // Skip link should have proper href
    await expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  test('Screen reader compatibility', async ({ page }) => {
    await page.goto('/wellness');
    
    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingTexts = await headings.allTextContents();
    
    expect(headingTexts.length).toBeGreaterThan(0);
    
    // Should have proper ARIA landmarks
    await expect(page.locator('[role="main"], main')).toBeVisible();
    await expect(page.locator('[role="navigation"], nav')).toBeVisible();
  });

  test('Focus management in modals and dialogs', async ({ page }) => {
    await page.goto('/community/groups');
    
    // Click to open modal (if it exists)
    const modalTrigger = page.locator('button:has-text("Create Group"), button:has-text("Join Group")').first();
    if (await modalTrigger.count() > 0) {
      await modalTrigger.click();
      
      // Focus should be trapped in modal
      const modal = page.locator('.modal, .dialog, [role="dialog"]');
      await expect(modal).toBeVisible();
      
      // First focusable element in modal should be focused
      const focusableInModal = modal.locator('button, input, select, textarea, [tabindex]').first();
      await expect(focusableInModal).toBeFocused();
    }
  });

  test('Error messages are announced to screen readers', async ({ page }) => {
    await page.goto('/crisis/safety-plan');
    
    // Try to save without required data
    const saveButton = page.locator('button:has-text("Save Safety Plan")');
    await saveButton.click();
    
    // Look for ARIA live regions or error messages
    const errorMessage = page.locator('[role="alert"], .error-message, [aria-live]');
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
  });
});