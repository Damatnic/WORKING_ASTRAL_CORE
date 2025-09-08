/**
 * Playwright Global Teardown
 * Cleanup that runs once after all E2E tests
 */

import { FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

async function globalTeardown(config: FullConfig) {
  console.log('🧪 Starting Playwright global teardown...')

  // Clean up test users from database if using real DB
  if (process.env.USE_REAL_DB === 'true') {
    try {
      const { PrismaClient } = require('@prisma/client')
      
      const prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.TEST_DATABASE_URL
          }
        }
      })
      
      console.log('🧽 Cleaning up test data...')
      
      // Delete test users and related data
      await prisma.crisisSession.deleteMany({
        where: {
          user: {
            email: {
              in: ['test@example.com', 'admin@example.com']
            }
          }
        }
      })
      
      await prisma.safetyPlan.deleteMany({
        where: {
          user: {
            email: {
              in: ['test@example.com', 'admin@example.com']
            }
          }
        }
      })
      
      await prisma.moodEntry.deleteMany({
        where: {
          user: {
            email: {
              in: ['test@example.com', 'admin@example.com']
            }
          }
        }
      })
      
      await prisma.auditLog.deleteMany({
        where: {
          user: {
            email: {
              in: ['test@example.com', 'admin@example.com']
            }
          }
        }
      })
      
      await prisma.user.deleteMany({
        where: {
          email: {
            in: ['test@example.com', 'admin@example.com']
          }
        }
      })
      
      await prisma.$disconnect()
      console.log('✅ Test data cleaned up')
    } catch (error) {
      console.warn('⚠️ Could not clean up test data:', error.message)
    }
  }

  // Archive test results if they exist
  try {
    const testResultsDir = path.join(__dirname, '../test-results')
    if (fs.existsSync(testResultsDir)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const archiveDir = path.join(__dirname, '../test-archives', timestamp)
      
      if (!fs.existsSync(path.dirname(archiveDir))) {
        fs.mkdirSync(path.dirname(archiveDir), { recursive: true })
      }
      
      // Only archive if there are failures or if explicitly requested
      const hasFailures = fs.existsSync(path.join(testResultsDir, 'failures'))
      if (hasFailures || process.env.ARCHIVE_TEST_RESULTS === 'true') {
        fs.renameSync(testResultsDir, archiveDir)
        console.log(`📎 Test results archived to: ${archiveDir}`)
      } else {
        // Clean up successful test results
        fs.rmSync(testResultsDir, { recursive: true, force: true })
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not archive test results:', error.message)
  }

  console.log('✅ Playwright global teardown complete')
}

export default globalTeardown