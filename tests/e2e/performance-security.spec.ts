import { test, expect } from '@playwright/test';

test.describe('Performance & Security Testing', () => {
  
  test('Page load performance benchmarks', async ({ page }) => {
    // Test critical pages load within acceptable timeframes
    const criticalPages = ['/crisis', '/wellness', '/therapy', '/dashboard'];
    
    for (const pagePath of criticalPages) {
      const start = Date.now();
      await page.goto(pagePath);
      const loadTime = Date.now() - start;
      
      // Crisis page must load fastest (life-critical)
      if (pagePath === '/crisis') {
        expect(loadTime).toBeLessThan(2000);
      } else {
        expect(loadTime).toBeLessThan(5000);
      }
      
      // Ensure page is interactive
      await expect(page.locator('h1, h2')).toBeVisible();
    }
  });

  test('Security headers and HTTPS enforcement', async ({ page }) => {
    const response = await page.goto('/');
    
    // Check security headers (when deployed)
    if (process.env.NODE_ENV === 'production') {
      expect(response?.headers()['x-frame-options']).toBeTruthy();
      expect(response?.headers()['x-content-type-options']).toBe('nosniff');
      expect(response?.headers()['strict-transport-security']).toBeTruthy();
    }
  });

  test('Form input sanitization', async ({ page }) => {
    await page.goto('/wellness/mood-tracker');
    
    // Test XSS prevention in notes field
    const xssPayload = '<script>alert("xss")</script>';
    await page.fill('textarea[placeholder*="notes"]', xssPayload);
    
    // Select a mood to enable save
    await page.click('[data-testid="mood-3"]');
    await page.click('button:has-text("Save Entry")');
    
    // Verify script doesn't execute
    const alerts = [];
    page.on('dialog', dialog => {
      alerts.push(dialog.message());
      dialog.accept();
    });
    
    await page.reload();
    expect(alerts).toHaveLength(0);
  });

  test('Memory leak prevention', async ({ page }) => {
    // Navigate between pages multiple times
    const pages = ['/dashboard', '/wellness', '/therapy', '/community', '/crisis'];
    
    for (let i = 0; i < 10; i++) {
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
      }
    }
    
    // Check JavaScript heap size (basic memory test)
    const metrics = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Should not exceed reasonable memory usage (50MB)
    if (metrics > 0) {
      expect(metrics).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test('API endpoint security', async ({ request }) => {
    // Test that sensitive endpoints require authentication
    const sensitiveEndpoints = [
      '/api/user/profile',
      '/api/mood-entries',
      '/api/safety-plan',
      '/api/therapy/sessions'
    ];
    
    for (const endpoint of sensitiveEndpoints) {
      const response = await request.get(endpoint);
      // Should return 401 Unauthorized or redirect to login
      expect([401, 403, 302]).toContain(response.status());
    }
  });

  test('Rate limiting on forms', async ({ page }) => {
    await page.goto('/wellness/mood-tracker');
    
    // Try to rapidly submit the same form
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="mood-3"]');
      await page.click('button:has-text("Save Entry")', { timeout: 1000 });
    }
    
    // Should eventually show rate limiting message or disable button
    const saveButton = page.locator('button:has-text("Save Entry")');
    await expect(saveButton).toBeDisabled({ timeout: 5000 });
  });
});