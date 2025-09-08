/**
 * Playwright Global Setup
 * Setup that runs once before all E2E tests
 */

import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

async function globalSetup(config: FullConfig) {
  console.log('🎭 Starting Playwright global setup...')

  // Set up test directories
  const testResultsDir = path.join(__dirname, '../test-results')
  if (fs.existsSync(testResultsDir)) {
    fs.rmSync(testResultsDir, { recursive: true, force: true })
  }
  fs.mkdirSync(testResultsDir, { recursive: true })

  // Create subdirectories
  const dirs = ['html-report', 'playwright-output', 'screenshots', 'videos', 'traces']
  for (const dir of dirs) {
    fs.mkdirSync(path.join(testResultsDir, dir), { recursive: true })
  }

  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.NEXT_TELEMETRY_DISABLED = '1'
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/astralcore_test'
  process.env.NEXTAUTH_SECRET = 'test-secret-for-e2e-tests'
  process.env.NEXTAUTH_URL = 'http://localhost:3000'
  
  // Initialize test users in database if using real DB
  if (process.env.USE_REAL_DB === 'true') {
    try {
      const { PrismaClient } = require('@prisma/client')
      const bcrypt = require('bcryptjs')
      
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.TEST_DATABASE_URL
          }
        }
      })
      
      console.log('👥 Creating test users...')
      
      // Create test users
      const hashedPassword = await bcrypt.hash('TestPassword123!', 12)
      
      await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
          email: 'test@example.com',
          hashedPassword,
          firstName: 'Test',
          lastName: 'User',
          role: 'USER',
          isActive: true,
          isVerified: true,
        }
      })
      
      await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
          email: 'admin@example.com',
          hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
        }
      })
      
      await prisma.$disconnect()
      console.log('✅ Test users created')
    } catch (error) {
      console.warn('⚠️ Could not create test users:', error.message)
    }
  }

  // Pre-warm browsers (Windows optimization)
  if (process.platform === 'win32') {
    try {
      console.log('🔥 Pre-warming browser for Windows...')
      const browser = await chromium.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ]
      })
      await browser.close()
      console.log('✅ Browser pre-warmed')
    } catch (error) {
      console.warn('⚠️ Could not pre-warm browser:', error.message)
    }
  }

  console.log('✅ Playwright global setup complete')
}

export default globalSetup