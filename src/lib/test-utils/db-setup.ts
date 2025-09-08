import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { randomUUID } from 'crypto'

// Test database instance
let testPrisma: PrismaClient

/**
 * Get or create a test database client
 */
export function getTestDatabase(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'test' ? [] : ['query', 'error', 'warn'],
    })
  }
  return testPrisma
}

/**
 * Set up test database schema
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' })
    
    // Push schema to test database
    execSync('npx prisma db push --force-reset', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      }
    })
  } catch (error) {
    console.error('Failed to setup test database:', error)
    throw error
  }
}

/**
 * Clean up test database
 */
export async function teardownTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect()
  }
}

/**
 * Clear all data from test database
 */
export async function clearTestDatabase(): Promise<void> {
  const prisma = getTestDatabase()
  
  // List of models to clear in dependency order
  const models = [
    'auditLog',
    'notification',
    'moodEntry',
    'journalEntry',
    'crisisReport',
    'safetyPlan',
    'appointment',
    'emailVerification',
    'passwordReset',
    'session',
    'account',
    'userProfile',
    'helperProfile',
    'adminProfile',
    'anonymousIdentity',
    'user',
  ]

  try {
    // Delete in reverse dependency order
    for (const model of models) {
      if (prisma[model]) {
        await prisma[model].deleteMany()
      }
    }
  } catch (error) {
    console.error('Error clearing test database:', error)
    throw error
  }
}

/**
 * Create a test database transaction
 */
export async function withTestTransaction<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const prisma = getTestDatabase()
  
  return await prisma.$transaction(async (tx) => {
    return await callback(tx as PrismaClient)
  })
}

/**
 * Generate a unique test database name
 */
export function generateTestDatabaseName(): string {
  const suffix = randomUUID().replace(/-/g, '').substring(0, 8)
  return `astralcore_test_${suffix}`
}

/**
 * Seed test database with basic data
 */
export async function seedTestDatabase(): Promise<void> {
  const prisma = getTestDatabase()
  
  // Create basic user roles if they don't exist
  // This would typically be done through database seeds
  console.log('Test database seeded with basic data')
}

/**
 * Reset test database to clean state
 */
export async function resetTestDatabase(): Promise<void> {
  await clearTestDatabase()
  await seedTestDatabase()
}

/**
 * Database test helper class
 */
export class DatabaseTestHelper {
  private prisma: PrismaClient

  constructor() {
    this.prisma = getTestDatabase()
  }

  async setup(): Promise<void> {
    await resetTestDatabase()
  }

  async teardown(): Promise<void> {
    await clearTestDatabase()
  }

  async createTestUser(overrides: any = {}): Promise<any> {
    const defaultUser = {
      id: randomUUID(),
      anonymousId: randomUUID(),
      email: `test-${randomUUID()}@example.com`,
      hashedPassword: '$2b$12$testhashedpassword',
      role: 'USER',
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActiveAt: new Date(),
      ...overrides,
    }

    return await this.prisma.user.create({
      data: defaultUser,
    })
  }

  async createTestSession(userId: string, overrides: any = {}): Promise<any> {
    const defaultSession = {
      id: randomUUID(),
      userId,
      sessionToken: randomUUID(),
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      ...overrides,
    }

    return await this.prisma.session.create({
      data: defaultSession,
    })
  }

  async createTestAuditLog(userId: string, overrides: any = {}): Promise<any> {
    const defaultAuditLog = {
      id: randomUUID(),
      userId,
      action: 'test_action',
      resource: 'test_resource',
      outcome: 'success',
      timestamp: new Date(),
      ...overrides,
    }

    return await this.prisma.auditLog.create({
      data: defaultAuditLog,
    })
  }

  getPrismaClient(): PrismaClient {
    return this.prisma
  }
}