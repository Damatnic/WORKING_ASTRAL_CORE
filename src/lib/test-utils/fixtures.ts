/**
 * Test Fixtures
 * Pre-defined test data and scenarios
 */

import { UserRole } from '@prisma/client'
import { userFactory, formDataFactory, apiResponseFactory } from './factories'
import type { User } from '@prisma/client'

// Test Users
export const testUsers = {
  regularUser: userFactory.create({
    id: '01234567-89ab-cdef-0123-456789abcdef',
    email: 'user@test.com',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.USER,
    hashedPassword: '$2b$12$dummyhash.for.testing.purposes.only',
  }),

  adminUser: userFactory.admin({
    id: '11234567-89ab-cdef-0123-456789abcdef',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
  }),

  therapistUser: userFactory.therapist({
    id: '21234567-89ab-cdef-0123-456789abcdef',
    email: 'therapist@test.com',
    firstName: 'Dr. Jane',
    lastName: 'Smith',
  }),

  crisisCounselorUser: userFactory.crisisCounselor({
    id: '31234567-89ab-cdef-0123-456789abcdef',
    email: 'counselor@test.com',
    firstName: 'Crisis',
    lastName: 'Counselor',
  }),

  superAdminUser: userFactory.superAdmin({
    id: '41234567-89ab-cdef-0123-456789abcdef',
    email: 'superadmin@test.com',
    firstName: 'Super',
    lastName: 'Admin',
  }),

  inactiveUser: userFactory.inactive({
    id: '51234567-89ab-cdef-0123-456789abcdef',
    email: 'inactive@test.com',
    firstName: 'Inactive',
    lastName: 'User',
  }),

  unverifiedUser: userFactory.unverified({
    id: '61234567-89ab-cdef-0123-456789abcdef',
    email: 'unverified@test.com',
    firstName: 'Unverified',
    lastName: 'User',
  }),

  lockedUser: userFactory.locked({
    id: '71234567-89ab-cdef-0123-456789abcdef',
    email: 'locked@test.com',
    firstName: 'Locked',
    lastName: 'User',
  }),

  mfaUser: userFactory.withMFA({
    id: '81234567-89ab-cdef-0123-456789abcdef',
    email: 'mfa@test.com',
    firstName: 'MFA',
    lastName: 'User',
  }),
}

// Authentication Fixtures
export const authFixtures = {
  validCredentials: {
    email: 'user@test.com',
    password: 'TestPassword123!',
  },

  invalidCredentials: {
    email: 'nonexistent@test.com',
    password: 'WrongPassword123!',
  },

  adminCredentials: {
    email: 'admin@test.com',
    password: 'AdminPassword123!',
  },

  therapistCredentials: {
    email: 'therapist@test.com',
    password: 'TherapistPassword123!',
  },

  validRegistration: formDataFactory.registrationForm({
    email: 'newuser@test.com',
    firstName: 'New',
    lastName: 'User',
  }),

  invalidRegistration: {
    email: 'invalid-email',
    password: 'weak',
    confirmPassword: 'different',
    firstName: '',
    lastName: '',
    acceptTerms: false,
  },

  validMFAToken: '123456',
  invalidMFAToken: '000000',
  validBackupCode: '12345678',
  invalidBackupCode: '00000000',
}

// Crisis Fixtures
export const crisisFixtures = {
  triggerKeywords: [
    'suicide',
    'kill myself',
    'hurt myself',
    'end it all',
    'want to die',
    'hopeless',
    'no point',
    'give up',
    'self harm',
    'cut myself',
  ],

  safeTriggerWords: [
    'stressed',
    'anxious',
    'sad',
    'worried',
    'tired',
    'overwhelmed',
  ],

  crisisMessages: [
    'I want to hurt myself',
    'I am thinking about suicide',
    'I have a plan to end my life',
    'Nothing matters anymore',
    'I want to die',
  ],

  supportMessages: [
    'I am feeling better today',
    'Thank you for your help',
    'I found the resources helpful',
    'I talked to my therapist',
    'My safety plan is working',
  ],

  emergencyContacts: {
    suicidePrevention: {
      name: 'National Suicide Prevention Lifeline',
      phone: '988',
      available: '24/7',
    },
    crisisText: {
      name: 'Crisis Text Line',
      phone: '741741',
      text: 'HOME',
      available: '24/7',
    },
    emergency: {
      name: 'Emergency Services',
      phone: '911',
      available: '24/7',
    },
  },
}

// API Response Fixtures
export const apiFixtures = {
  successfulLogin: apiResponseFactory.success({
    user: testUsers.regularUser,
    token: 'mock-jwt-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600,
  }),

  unsuccessfulLogin: apiResponseFactory.error('Invalid credentials', 401),

  validationErrors: apiResponseFactory.validationError({
    email: ['Email is required'],
    password: ['Password must be at least 8 characters'],
  }),

  serverError: apiResponseFactory.error('Internal server error', 500),

  notFound: apiResponseFactory.error('Resource not found', 404),

  forbidden: apiResponseFactory.error('Access denied', 403),

  rateLimited: apiResponseFactory.error('Too many requests', 429),
}

// Mock Session Data
export const sessionFixtures = {
  authenticatedSession: {
    user: {
      id: testUsers.regularUser.id,
      email: testUsers.regularUser.email,
      firstName: testUsers.regularUser.firstName,
      lastName: testUsers.regularUser.lastName,
      role: testUsers.regularUser.role,
      avatar: testUsers.regularUser.avatar,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },

  adminSession: {
    user: {
      id: testUsers.adminUser.id,
      email: testUsers.adminUser.email,
      firstName: testUsers.adminUser.firstName,
      lastName: testUsers.adminUser.lastName,
      role: testUsers.adminUser.role,
      avatar: testUsers.adminUser.avatar,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },

  therapistSession: {
    user: {
      id: testUsers.therapistUser.id,
      email: testUsers.therapistUser.email,
      firstName: testUsers.therapistUser.firstName,
      lastName: testUsers.therapistUser.lastName,
      role: testUsers.therapistUser.role,
      avatar: testUsers.therapistUser.avatar,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },

  expiredSession: {
    user: {
      id: testUsers.regularUser.id,
      email: testUsers.regularUser.email,
      firstName: testUsers.regularUser.firstName,
      lastName: testUsers.regularUser.lastName,
      role: testUsers.regularUser.role,
      avatar: testUsers.regularUser.avatar,
    },
    expires: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },

  nullSession: null,
}

// Database Fixtures
export const dbFixtures = {
  emptyDatabase: {
    users: [],
    crisisSessions: [],
    safetyPlans: [],
    moodEntries: [],
    auditLogs: [],
  },

  populatedDatabase: {
    users: Object.values(testUsers),
    crisisSessions: [],
    safetyPlans: [],
    moodEntries: [],
    auditLogs: [],
  },
}

// Export all fixtures
export const fixtures = {
  users: testUsers,
  auth: authFixtures,
  crisis: crisisFixtures,
  api: apiFixtures,
  session: sessionFixtures,
  db: dbFixtures,
}

export default fixtures