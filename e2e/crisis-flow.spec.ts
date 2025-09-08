import { test, expect } from '@playwright/test'

test.describe('Crisis Intervention Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('Crisis button is always visible and accessible', async ({ page }) => {
    // Check crisis button is visible on homepage
    const crisisButton = page.getByRole('button', { name: /crisis support/i })
    await expect(crisisButton).toBeVisible()
    await expect(crisisButton).toHaveCSS('position', 'fixed')
    
    // Navigate to different pages and ensure button persists
    await page.goto('/community')
    await expect(crisisButton).toBeVisible()
    
    await page.goto('/wellness')
    await expect(crisisButton).toBeVisible()
  })

  test('Crisis button opens intervention modal with resources', async ({ page }) => {
    const crisisButton = page.getByRole('button', { name: /crisis support/i })
    await crisisButton.click()
    
    // Check modal appears
    await expect(page.getByText(/immediate help/i)).toBeVisible()
    
    // Verify emergency numbers are displayed
    await expect(page.getByText('988')).toBeVisible()
    await expect(page.getByText(/Crisis Text Line/i)).toBeVisible()
    await expect(page.getByText('Text HOME to 741741')).toBeVisible()
    
    // Check for international resources
    await expect(page.getByText(/International Resources/i)).toBeVisible()
  })

  test('Crisis chat connects to counselor', async ({ page }) => {
    // Open crisis modal
    await page.getByRole('button', { name: /crisis support/i }).click()
    
    // Click on crisis chat option
    await page.getByRole('button', { name: /start crisis chat/i }).click()
    
    // Verify chat interface opens
    await expect(page.getByText(/Connecting to crisis counselor/i)).toBeVisible()
    
    // Wait for connection (mocked in test environment)
    await expect(page.getByText(/You are now connected/i)).toBeVisible({ timeout: 10000 })
    
    // Type a message
    const chatInput = page.getByPlaceholder(/Type your message/i)
    await chatInput.fill('I need someone to talk to')
    await chatInput.press('Enter')
    
    // Verify message appears
    await expect(page.getByText('I need someone to talk to')).toBeVisible()
  })

  test('Crisis keywords trigger immediate intervention', async ({ page }) => {
    // Navigate to AI therapy
    await page.goto('/ai-therapy')
    
    // Type crisis keyword
    const input = page.getByPlaceholder(/How are you feeling/i)
    await input.fill('I want to hurt myself')
    
    // Should immediately show crisis intervention
    await expect(page.getByText(/immediate support/i)).toBeVisible()
    await expect(page.getByText('988')).toBeVisible()
    
    // Should block sending the message and show resources instead
    const sendButton = page.getByRole('button', { name: /send/i })
    await expect(sendButton).toBeDisabled()
  })

  test('Safety plan builder is accessible', async ({ page }) => {
    await page.getByRole('button', { name: /crisis support/i }).click()
    await page.getByRole('button', { name: /create safety plan/i }).click()
    
    // Verify safety plan builder opens
    await expect(page.getByText(/Safety Plan Builder/i)).toBeVisible()
    
    // Fill out warning signs
    await page.getByLabel(/Warning signs/i).fill('Feeling overwhelmed, isolation')
    
    // Fill out coping strategies
    await page.getByLabel(/Coping strategies/i).fill('Deep breathing, calling a friend')
    
    // Add support contacts
    await page.getByRole('button', { name: /add contact/i }).click()
    await page.getByLabel(/Contact name/i).fill('Best Friend')
    await page.getByLabel(/Phone number/i).fill('555-0123')
    
    // Save safety plan
    await page.getByRole('button', { name: /save safety plan/i }).click()
    await expect(page.getByText(/Safety plan saved/i)).toBeVisible()
  })

  test('Crisis resources are accessible without login', async ({ page }) => {
    // Ensure we're not logged in
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    
    // Crisis button should still be visible
    const crisisButton = page.getByRole('button', { name: /crisis support/i })
    await expect(crisisButton).toBeVisible()
    
    // Can still access resources
    await crisisButton.click()
    await expect(page.getByText('988')).toBeVisible()
  })

  test('Crisis intervention respects user privacy', async ({ page }) => {
    // Enable privacy mode
    await page.goto('/settings')
    await page.getByLabel(/Privacy mode/i).check()
    
    // Trigger crisis intervention
    await page.getByRole('button', { name: /crisis support/i }).click()
    
    // Check that analytics are not sent
    const requests: string[] = []
    page.on('request', request => {
      requests.push(request.url())
    })
    
    await page.getByRole('button', { name: /start crisis chat/i }).click()
    
    // Verify no analytics requests were made
    const analyticsRequests = requests.filter(url => url.includes('/api/analytics'))
    expect(analyticsRequests).toHaveLength(0)
  })

  test('Crisis resources load quickly even on slow connection', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 100)
    })
    
    const startTime = Date.now()
    await page.getByRole('button', { name: /crisis support/i }).click()
    
    // Crisis resources should appear within 3 seconds even on slow connection
    await expect(page.getByText('988')).toBeVisible()
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(3000)
  })

  test('Accessibility: Crisis features work with keyboard navigation', async ({ page }) => {
    // Tab to crisis button
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Activate with Enter key
    await page.keyboard.press('Enter')
    
    // Modal should open
    await expect(page.getByText(/immediate help/i)).toBeVisible()
    
    // Tab through options
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: /call 988/i })).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: /start crisis chat/i })).toBeFocused()
    
    // Escape key closes modal
    await page.keyboard.press('Escape')
    await expect(page.getByText(/immediate help/i)).not.toBeVisible()
  })

  test('Crisis history is saved for follow-up care', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel(/Email/i).fill('test@example.com')
    await page.getByLabel(/Password/i).fill('TestPassword123!')
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Trigger crisis intervention
    await page.getByRole('button', { name: /crisis support/i }).click()
    await page.getByRole('button', { name: /start crisis chat/i }).click()
    
    // Send a message
    const chatInput = page.getByPlaceholder(/Type your message/i)
    await chatInput.fill('I need help with anxiety')
    await chatInput.press('Enter')
    
    // End chat
    await page.getByRole('button', { name: /end chat/i }).click()
    
    // Navigate to history
    await page.goto('/profile/crisis-history')
    
    // Verify the interaction was saved
    await expect(page.getByText(/Crisis Chat Session/i)).toBeVisible()
    await expect(page.getByText('I need help with anxiety')).toBeVisible()
  })
})