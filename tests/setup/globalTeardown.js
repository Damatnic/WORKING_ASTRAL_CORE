/**
 * Global Test Teardown
 * Cleanup that runs once after all tests
 */

module.exports = async () => {
  console.log('🧪 Starting global test teardown...')

  // Cleanup test database (if using real database)
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
      
      console.log('🧽 Cleaning up test database...')
      await prisma.$executeRaw`TRUNCATE TABLE "User" RESTART IDENTITY CASCADE`
      await prisma.$executeRaw`TRUNCATE TABLE "AuditLog" RESTART IDENTITY CASCADE`
      await prisma.$executeRaw`TRUNCATE TABLE "CrisisSession" RESTART IDENTITY CASCADE`
      await prisma.$executeRaw`TRUNCATE TABLE "SafetyPlan" RESTART IDENTITY CASCADE`
      await prisma.$executeRaw`TRUNCATE TABLE "MoodEntry" RESTART IDENTITY CASCADE`
      
      await prisma.$disconnect()
      console.log('✅ Test database cleanup complete')
    } catch (error) {
      console.warn('⚠️ Could not cleanup test database:', error.message)
    }
  }

  // Force cleanup any hanging connections or processes
  if (global.gc) {
    global.gc()
  }

  // Close any open handles
  const activeHandles = process._getActiveHandles()
  if (activeHandles.length > 0) {
    console.log(`🧽 Cleaning up ${activeHandles.length} active handles...`)
    activeHandles.forEach((handle) => {
      if (handle && typeof handle.unref === 'function') {
        handle.unref()
      }
    })
  }

  console.log('✅ Global test teardown complete')
}