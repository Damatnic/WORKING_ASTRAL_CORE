import { defineConfig, devices } from '@playwright/test'
import path from 'path'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 * Enhanced configuration for Windows compatibility
 */
export default defineConfig({
  testDir: './e2e',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only (Windows-friendly retry strategy) */
  retries: process.env.CI ? 3 : 1,
  
  /* Opt out of parallel tests on CI, limit workers on Windows */
  workers: process.env.CI 
    ? 1 
    : Math.min(4, Math.floor(require('os').cpus().length / 2)),
  
  /* Reporter to use (Windows-compatible paths) */
  reporter: [
    ['html', { 
      outputFolder: path.join(__dirname, 'test-results', 'html-report'),
      open: 'never' // Don't auto-open on Windows
    }],
    ['json', { 
      outputFile: path.join(__dirname, 'test-results', 'results.json')
    }],
    ['junit', { 
      outputFile: path.join(__dirname, 'test-results', 'results.xml')
    }],
    ['list'],
    // GitHub Actions compatible reporter
    ...(process.env.CI ? [['github']] : []),
  ],
  
  /* Shared settings for all projects */
  use: {
    /* Base URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying failed test */
    trace: 'on-first-retry',
    
    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Capture video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action (increased for Windows) */
    actionTimeout: 15000,
    
    /* Global timeout for navigation (increased for Windows) */
    navigationTimeout: 45000,
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* User agent */
    userAgent: 'Playwright Test Bot',
    
    /* Viewport size */
    viewport: { width: 1280, height: 720 },
    
    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
    
    /* Geolocation */
    geolocation: { longitude: -74.0059, latitude: 40.7128 }, // New York
    permissions: ['geolocation'],
    
    /* Color scheme */
    colorScheme: 'light',
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    
    // Cleanup project
    {
      name: 'cleanup',
      testMatch: /.*\.cleanup\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Windows-specific Chrome flags
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
          ],
        },
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webnotifications.enabled': false,
            'media.navigator.permission.disabled': true,
          },
        },
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        // Note: WebKit on Windows may have limitations
      },
      dependencies: ['setup'],
    },

    // Microsoft Edge (important for Windows testing)
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge',
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
          ],
        },
      },
      dependencies: ['setup'],
    },

    /* Test against mobile viewports */
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        // Mobile-specific configuration
        hasTouch: true,
        isMobile: true,
      },
      dependencies: ['setup'],
    },
    
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true,
      },
      dependencies: ['setup'],
    },

    // Accessibility testing project
    {
      name: 'accessibility',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // High contrast mode for accessibility testing
        colorScheme: 'dark',
        reducedMotion: 'reduce',
      },
      dependencies: ['setup'],
    },

    // Performance testing project
    {
      name: 'performance',
      testMatch: /.*\.perf\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Performance testing configuration
        launchOptions: {
          args: [
            '--enable-logging',
            '--log-level=0',
            '--disable-background-timer-throttling',
          ],
        },
      },
      dependencies: ['setup'],
    },
  ],

  /* Global setup and teardown (Windows-compatible paths) */
  globalSetup: path.join(__dirname, 'e2e', 'global-setup.ts'),
  globalTeardown: path.join(__dirname, 'e2e', 'global-teardown.ts'),

  /* Run local dev server before starting tests (Windows-compatible) */
  webServer: {
    command: process.platform === 'win32' ? 'npm.cmd run dev' : 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/astralcore_test',
      NEXTAUTH_SECRET: 'test-secret-for-e2e-tests',
      NEXTAUTH_URL: 'http://localhost:3000',
      // Disable analytics in test mode
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },

  /* Folder for test artifacts (Windows-compatible) */
  outputDir: path.join(__dirname, 'test-results', 'playwright-output'),

  /* Expect configuration */
  expect: {
    timeout: 10000,
    threshold: 0.2,
    toHaveScreenshot: { 
      threshold: 0.2, 
      mode: 'pixel',
      animations: 'disabled', // Disable animations for consistent screenshots
    },
    toMatchSnapshot: { 
      threshold: 0.2,
      mode: 'pixel',
    },
  },

  /* Global test timeout (increased for Windows) */
  timeout: 90000,

  /* Test ignore patterns (Windows path-compatible) */
  testIgnore: [
    '**/node_modules/**',
    '**/.next/**',
    '**/coverage/**',
    '**/test-results/**',
    '**/playwright-report/**',
    '**/*.backup.*',
  ],

  /* Metadata for test runs */
  metadata: {
    platform: process.platform,
    node_version: process.version,
    timestamp: new Date().toISOString(),
  },

  /* Update snapshots on Windows */
  updateSnapshots: process.env.UPDATE_SNAPSHOTS === 'true' ? 'all' : 'missing',

  /* Preserve output on failure */
  preserveOutput: 'failures-only',
})