/**
 * Test Data Factories
 * Generate realistic test data for various entities
 */

import { faker } from '@faker-js/faker'
import { UserRole } from '@prisma/client'
import type { User, CrisisSession, SafetyPlan, MoodEntry } from '@prisma/client'

// User Factory
export const userFactory = {
  create: (overrides: Partial<User> = {}): User => ({
    id: faker.string.uuid(),
    email: faker.internet.email(),
    hashedPassword: faker.string.alphanumeric(60), // Bcrypt hash length
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role: UserRole.USER,
    isActive: true,
    isVerified: true,
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: faker.date.recent(),
    lastActiveAt: faker.date.recent(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    deletedAt: null,
    avatar: faker.image.avatar(),
    timezone: 'America/New_York',
    preferences: {
      language: 'en',
      theme: 'light',
      notifications: {
        email: true,
        push: true,
        crisis: true,
      },
    },
    mfaEnabled: false,
    mfaSecret: null,
    mfaBackupCodes: [],
    privacySettings: {
      shareData: false,
      analytics: false,
      marketing: false,
    },
    ...overrides,
  }),

  createBatch: (count: number, overrides: Partial<User> = {}): User[] => {
    return Array.from({ length: count }, () => userFactory.create(overrides))
  },

  admin: (overrides: Partial<User> = {}): User => 
    userFactory.create({ role: UserRole.ADMIN, ...overrides }),

  therapist: (overrides: Partial<User> = {}): User => 
    userFactory.create({ role: UserRole.THERAPIST, ...overrides }),

  crisisCounselor: (overrides: Partial<User> = {}): User => 
    userFactory.create({ role: UserRole.CRISIS_COUNSELOR, ...overrides }),

  helper: (overrides: Partial<User> = {}): User => 
    userFactory.create({ role: UserRole.HELPER, ...overrides }),

  superAdmin: (overrides: Partial<User> = {}): User => 
    userFactory.create({ role: UserRole.SUPER_ADMIN, ...overrides }),

  inactive: (overrides: Partial<User> = {}): User => 
    userFactory.create({ isActive: false, ...overrides }),

  unverified: (overrides: Partial<User> = {}): User => 
    userFactory.create({ isVerified: false, ...overrides }),

  locked: (overrides: Partial<User> = {}): User => 
    userFactory.create({ 
      failedLoginAttempts: 5,
      lockedUntil: faker.date.future(),
      ...overrides 
    }),

  withMFA: (overrides: Partial<User> = {}): User => 
    userFactory.create({ 
      mfaEnabled: true,
      mfaSecret: faker.string.alphanumeric(32),
      mfaBackupCodes: Array.from({ length: 10 }, () => faker.string.numeric(8)),
      ...overrides 
    }),
}

// API Response Factories
export const apiResponseFactory = {
  success: <T>(data: T) => ({
    success: true,
    data,
    message: 'Operation completed successfully',
    timestamp: new Date().toISOString(),
  }),

  error: (message: string, code = 500) => ({
    success: false,
    error: {
      message,
      code,
      timestamp: new Date().toISOString(),
    },
  }),

  validationError: (errors: Record<string, string[]>) => ({
    success: false,
    error: {
      message: 'Validation failed',
      code: 400,
      details: errors,
      timestamp: new Date().toISOString(),
    },
  }),
}

// Form Data Factories
export const formDataFactory = {
  loginForm: (overrides = {}) => ({
    email: faker.internet.email(),
    password: 'TestPassword123!',
    rememberMe: false,
    ...overrides,
  }),

  registrationForm: (overrides = {}) => ({
    email: faker.internet.email(),
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    acceptTerms: true,
    ...overrides,
  }),

  moodForm: (overrides = {}) => ({
    mood: faker.helpers.arrayElement(['VERY_LOW', 'LOW', 'NEUTRAL', 'GOOD', 'VERY_GOOD']),
    energy: faker.number.int({ min: 1, max: 10 }),
    stress: faker.number.int({ min: 1, max: 10 }),
    anxiety: faker.number.int({ min: 1, max: 10 }),
    sleep: faker.number.int({ min: 1, max: 12 }),
    notes: faker.lorem.sentence(),
    tags: [],
    activities: [],
    triggers: [],
    ...overrides,
  }),
}

// Export all factories
export const factories = {
  user: userFactory,
  apiResponse: apiResponseFactory,
  formData: formDataFactory,
}

export default factories