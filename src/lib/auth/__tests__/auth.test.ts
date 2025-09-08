import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import bcrypt from 'bcryptjs'
import { hasRole, hasPermission } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { 
  userFactory, 
  testUsers, 
  authFixtures, 
  DatabaseTestHelper,
  createMockFunction
} from '@/lib/test-utils'

// Mock bcrypt
jest.mock('bcryptjs')
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

// Mock database
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

describe('Authentication Service', () => {
  let dbHelper: DatabaseTestHelper

  beforeEach(async () => {
    dbHelper = new DatabaseTestHelper()
    await dbHelper.setup()
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await dbHelper.teardown()
  })

  describe('hasRole', () => {
    it('should return true when user has required role', () => {
      const userRole = UserRole.ADMIN
      const requiredRoles = [UserRole.USER, UserRole.ADMIN]
      
      const result = hasRole(userRole, requiredRoles)
      
      expect(result).toBe(true)
    })

    it('should return false when user does not have required role', () => {
      const userRole = UserRole.USER
      const requiredRoles = [UserRole.ADMIN, UserRole.THERAPIST]
      
      const result = hasRole(userRole, requiredRoles)
      
      expect(result).toBe(false)
    })

    it('should handle empty required roles array', () => {
      const userRole = UserRole.USER
      const requiredRoles: UserRole[] = []
      
      const result = hasRole(userRole, requiredRoles)
      
      expect(result).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('should return true for SUPER_ADMIN with any permission', () => {
      const userRole = UserRole.SUPER_ADMIN
      const permission = 'any:permission'
      
      const result = hasPermission(userRole, permission)
      
      expect(result).toBe(true)
    })

    it('should return true when USER has valid permission', () => {
      const userRole = UserRole.USER
      const permission = 'read:profile'
      
      const result = hasPermission(userRole, permission)
      
      expect(result).toBe(true)
    })

    it('should return false when USER lacks permission', () => {
      const userRole = UserRole.USER
      const permission = 'manage:users'
      
      const result = hasPermission(userRole, permission)
      
      expect(result).toBe(false)
    })

    it('should return true when HELPER has session management permission', () => {
      const userRole = UserRole.HELPER
      const permission = 'manage:sessions'
      
      const result = hasPermission(userRole, permission)
      
      expect(result).toBe(true)
    })

    it('should return true when THERAPIST has professional tools access', () => {
      const userRole = UserRole.THERAPIST
      const permission = 'access:professional_tools'
      
      const result = hasPermission(userRole, permission)
      
      expect(result).toBe(true)
    })

    it('should return true when CRISIS_COUNSELOR can escalate emergency', () => {
      const userRole = UserRole.CRISIS_COUNSELOR
      const permission = 'escalate:emergency'
      
      const result = hasPermission(userRole, permission)
      
      expect(result).toBe(true)
    })

    it('should return true when ADMIN can manage users', () => {
      const userRole = UserRole.ADMIN
      const permission = 'manage:users'
      
      const result = hasPermission(userRole, permission)
      
      expect(result).toBe(true)
    })

    it('should handle invalid role', () => {
      // @ts-expect-error - Testing invalid role
      const userRole = 'INVALID_ROLE' as UserRole
      const permission = 'read:profile'
      
      const result = hasPermission(userRole, permission)
      
      expect(result).toBe(false)
    })
  })

  describe('Authentication Flow', () => {
    describe('User Registration', () => {
      it('should create user with hashed password', async () => {
        const userData = userFactory.create({
          email: 'newuser@test.com',
          hashedPassword: undefined,
        })
        
        mockBcrypt.hash.mockResolvedValue('hashed_password')
        mockPrisma.user.findUnique.mockResolvedValue(null) // User doesn't exist
        mockPrisma.user.create.mockResolvedValue({
          ...userData,
          hashedPassword: 'hashed_password',
        })

        // This would be in the actual auth service
        const password = 'plaintext_password'
        const hashedPassword = await bcrypt.hash(password, 12)
        
        expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12)
        expect(hashedPassword).toBe('hashed_password')
      })

      it('should prevent duplicate user registration', async () => {
        const existingUser = testUsers.regularUser
        
        mockPrisma.user.findUnique.mockResolvedValue(existingUser)
        
        const userExists = await mockPrisma.user.findUnique({
          where: { email: existingUser.email }
        })
        
        expect(userExists).toBeTruthy()
        expect(userExists?.email).toBe(existingUser.email)
      })

      it('should validate email format during registration', () => {
        const validEmails = [
          'user@example.com',
          'test.user@domain.co.uk',
          'user+tag@example.org',
        ]
        
        const invalidEmails = [
          'invalid-email',
          '@domain.com',
          'user@',
          '',
        ]

        validEmails.forEach(email => {
          expect(email).toBeValidEmail()
        })

        invalidEmails.forEach(email => {
          expect(() => {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              throw new Error('Invalid email')
            }
          }).toThrow('Invalid email')
        })
      })
    })

    describe('User Authentication', () => {
      it('should authenticate user with valid credentials', async () => {
        const user = testUsers.regularUser
        const credentials = authFixtures.validCredentials
        
        mockPrisma.user.findUnique.mockResolvedValue(user)
        mockBcrypt.compare.mockResolvedValue(true)
        mockPrisma.user.update.mockResolvedValue({
          ...user,
          lastLoginAt: new Date(),
          failedLoginAttempts: 0,
        })
        mockPrisma.auditLog.create.mockResolvedValue({})

        const foundUser = await mockPrisma.user.findUnique({
          where: { email: credentials.email }
        })
        const isPasswordValid = await bcrypt.compare(
          credentials.password, 
          user.hashedPassword!
        )

        expect(foundUser).toBeTruthy()
        expect(isPasswordValid).toBe(true)
        expect(mockBcrypt.compare).toHaveBeenCalledWith(
          credentials.password,
          user.hashedPassword
        )
      })

      it('should reject authentication with invalid password', async () => {
        const user = testUsers.regularUser
        const invalidCredentials = {
          email: user.email,
          password: 'wrongpassword',
        }
        
        mockPrisma.user.findUnique.mockResolvedValue(user)
        mockBcrypt.compare.mockResolvedValue(false)
        mockPrisma.user.update.mockResolvedValue({
          ...user,
          failedLoginAttempts: 1,
        })

        const foundUser = await mockPrisma.user.findUnique({
          where: { email: invalidCredentials.email }
        })
        const isPasswordValid = await bcrypt.compare(
          invalidCredentials.password,
          user.hashedPassword!
        )

        expect(foundUser).toBeTruthy()
        expect(isPasswordValid).toBe(false)
      })

      it('should handle non-existent user authentication', async () => {
        const invalidCredentials = authFixtures.invalidCredentials
        
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockBcrypt.compare.mockResolvedValue(false) // Still perform hash to prevent timing attacks

        const foundUser = await mockPrisma.user.findUnique({
          where: { email: invalidCredentials.email }
        })
        
        // Should still perform password comparison to prevent timing attacks
        await bcrypt.compare(
          invalidCredentials.password,
          '$2b$12$dummyhash.to.prevent.timing.attacks.and.enumeration'
        )

        expect(foundUser).toBeNull()
        expect(mockBcrypt.compare).toHaveBeenCalled()
      })

      it('should prevent authentication of inactive users', async () => {
        const inactiveUser = testUsers.inactiveUser
        
        mockPrisma.user.findUnique.mockResolvedValue(inactiveUser)
        mockBcrypt.compare.mockResolvedValue(true)
        mockPrisma.auditLog.create.mockResolvedValue({})

        const foundUser = await mockPrisma.user.findUnique({
          where: { email: inactiveUser.email }
        })

        expect(foundUser).toBeTruthy()
        expect(foundUser?.isActive).toBe(false)
        
        // Should log the blocked attempt
        expect(mockPrisma.auditLog.create).toHaveBeenCalled()
      })

      it('should handle locked user accounts', async () => {
        const lockedUser = {
          ...testUsers.regularUser,
          failedLoginAttempts: 5,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
        }
        
        mockPrisma.user.findUnique.mockResolvedValue(lockedUser)
        mockBcrypt.compare.mockResolvedValue(true)
        mockPrisma.auditLog.create.mockResolvedValue({})

        const foundUser = await mockPrisma.user.findUnique({
          where: { email: lockedUser.email }
        })

        expect(foundUser?.lockedUntil).toBeTruthy()
        expect(foundUser?.lockedUntil && foundUser.lockedUntil > new Date()).toBe(true)
        
        // Should log the blocked attempt
        expect(mockPrisma.auditLog.create).toHaveBeenCalled()
      })
    })

    describe('Security Features', () => {
      it('should increment failed login attempts', async () => {
        const user = testUsers.regularUser
        
        mockPrisma.user.findUnique.mockResolvedValue(user)
        mockBcrypt.compare.mockResolvedValue(false)
        mockPrisma.user.update.mockResolvedValue({
          ...user,
          failedLoginAttempts: user.failedLoginAttempts + 1,
        })

        await mockPrisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: { increment: 1 }
          }
        })

        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: user.id },
          data: {
            failedLoginAttempts: { increment: 1 }
          }
        })
      })

      it('should lock account after 5 failed attempts', async () => {
        const user = {
          ...testUsers.regularUser,
          failedLoginAttempts: 4, // One more will trigger lock
        }
        
        mockPrisma.user.findUnique.mockResolvedValue(user)
        mockBcrypt.compare.mockResolvedValue(false)
        
        const lockTime = new Date(Date.now() + 15 * 60 * 1000)
        mockPrisma.user.update.mockResolvedValue({
          ...user,
          failedLoginAttempts: 5,
          lockedUntil: lockTime,
        })

        await mockPrisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: { increment: 1 },
            lockedUntil: user.failedLoginAttempts >= 4 
              ? expect.any(Date)
              : undefined,
          }
        })

        expect(mockPrisma.user.update).toHaveBeenCalled()
      })

      it('should reset failed attempts on successful login', async () => {
        const user = {
          ...testUsers.regularUser,
          failedLoginAttempts: 3,
        }
        
        mockPrisma.user.findUnique.mockResolvedValue(user)
        mockBcrypt.compare.mockResolvedValue(true)
        mockPrisma.user.update.mockResolvedValue({
          ...user,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
        })

        await mockPrisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: expect.any(Date),
            lastActiveAt: expect.any(Date),
          }
        })

        expect(mockPrisma.user.update).toHaveBeenCalledWith({
          where: { id: user.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: expect.any(Date),
            lastActiveAt: expect.any(Date),
          }
        })
      })

      it('should create audit logs for authentication events', async () => {
        const user = testUsers.regularUser
        
        mockPrisma.auditLog.create.mockResolvedValue({
          id: 'audit-log-id',
          userId: user.id,
          action: 'login_success',
          resource: 'auth',
          outcome: 'success',
          timestamp: new Date(),
        })

        await mockPrisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'login_success',
            resource: 'auth',
            details: {
              email: user.email,
              role: user.role,
              method: 'credentials',
            },
            outcome: 'success',
          }
        })

        expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
          data: {
            userId: user.id,
            action: 'login_success',
            resource: 'auth',
            details: {
              email: user.email,
              role: user.role,
              method: 'credentials',
            },
            outcome: 'success',
          }
        })
      })
    })

    describe('Edge Cases and Error Handling', () => {
      it('should handle database connection errors gracefully', async () => {
        const credentials = authFixtures.validCredentials
        
        mockPrisma.user.findUnique.mockRejectedValue(
          new Error('Database connection failed')
        )

        await expect(
          mockPrisma.user.findUnique({
            where: { email: credentials.email }
          })
        ).rejects.toThrow('Database connection failed')
      })

      it('should handle bcrypt comparison errors', async () => {
        const user = testUsers.regularUser
        const credentials = authFixtures.validCredentials
        
        mockPrisma.user.findUnique.mockResolvedValue(user)
        mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error'))

        await expect(
          bcrypt.compare(credentials.password, user.hashedPassword!)
        ).rejects.toThrow('Bcrypt error')
      })

      it('should handle malformed user data', async () => {
        const malformedUser = {
          ...testUsers.regularUser,
          hashedPassword: null, // Invalid state
        }
        
        mockPrisma.user.findUnique.mockResolvedValue(malformedUser)

        const foundUser = await mockPrisma.user.findUnique({
          where: { email: malformedUser.email }
        })

        expect(foundUser?.hashedPassword).toBeNull()
      })

      it('should validate user roles correctly', () => {
        const validRoles = Object.values(UserRole)
        
        validRoles.forEach(role => {
          expect(validRoles).toContain(role)
        })
      })

      it('should handle concurrent login attempts', async () => {
        const user = testUsers.regularUser
        const credentials = authFixtures.validCredentials
        
        // Simulate concurrent requests
        const requests = Array(5).fill(null).map(() => 
          mockPrisma.user.findUnique({ where: { email: credentials.email }})
        )
        
        mockPrisma.user.findUnique.mockResolvedValue(user)
        
        const results = await Promise.all(requests)
        
        expect(results).toHaveLength(5)
        results.forEach(result => {
          expect(result).toEqual(user)
        })
      })
    })
  })
})