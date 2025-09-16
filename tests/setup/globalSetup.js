/**
 * Global Test Setup
 * Configuration that runs once before all tests
 */

const { execSync } = require('child_process')
const path = require('path')

module.exports = async () => {
  console.log('🧪 Starting global test setup...')

  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.NEXT_TELEMETRY_DISABLED = '1'
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/astralcore_test'
  process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only'
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters-long-for-testing-only'

  // Initialize test database (if using real database)
  if (process.env.USE_REAL_DB === 'true') {
    try {
      console.log('📦 Setting up test database...')
      execSync('npx prisma db push --force-reset', { 
        stdio: 'inherit',
        env: { 
          ...process.env,
          DATABASE_URL: process.env.TEST_DATABASE_URL
        }
      })
      console.log('✅ Test database setup complete')
    } catch (error) {
      console.warn('⚠️ Could not setup test database, using mocks instead')
    }
  }

  // Clear any existing test artifacts
  try {
    const fs = require('fs')
    const testResultsPath = path.join(__dirname, '../../test-results')
    if (fs.existsSync(testResultsPath)) {
      fs.rmSync(testResultsPath, { recursive: true, force: true })
    }
    fs.mkdirSync(testResultsPath, { recursive: true })
  } catch (error) {
    console.warn('⚠️ Could not clean test artifacts:', error.message)
  }

  console.log('✅ Global test setup complete')
}