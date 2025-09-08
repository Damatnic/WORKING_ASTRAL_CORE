import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import { RBACService, ResourceContext, PermissionCheckResult } from './rbac-service'
import { Resource, Action, hasPermission, getRolePermissions, SYSTEM_ROLES } from './permissions'
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types'
import { 
  userFactory, 
  testUsers, 
  DatabaseTestHelper,
  createMockFunction 
} from '@/lib/test-utils'

// Mock dependencies
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  temporaryPermission: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  journalEntry: {
    findUnique: jest.fn(),
  },
  moodEntry: {
    findUnique: jest.fn(),
  },
  communityPost: {
    findUnique: jest.fn(),
  },
  file: {
    findUnique: jest.fn(),
  },
}

const mockAuditService = {
  logEvent: jest.fn(),
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

jest.mock('@/lib/audit/audit-service', () => ({
  auditService: mockAuditService,
}))

describe('RBAC Service', () => {
  let rbacService: RBACService
  let dbHelper: DatabaseTestHelper

  beforeEach(async () => {
    rbacService = RBACService.getInstance()
    rbacService.clearCache() // Clear cache before each test
    dbHelper = new DatabaseTestHelper()
    await dbHelper.setup()
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await dbHelper.teardown()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = RBACService.getInstance()
      const instance2 = RBACService.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBeInstanceOf(RBACService)
    })
  })

  describe('checkPermission', () => {
    const createContext = (overrides: Partial<ResourceContext> = {}): ResourceContext => ({
      userId: testUsers.regularUser.id,
      userRole: 'USER',
      userEmail: testUsers.regularUser.email,
      ...overrides,
    })

    it('should grant permission for super admin', async () => {
      const context = createContext({ userRole: 'SUPER_ADMIN' })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.USER,
        Action.DELETE
      )
      
      expect(result.allowed).toBe(true)
      expect(result.reason).toContain('Super admin')
    })

    it('should grant permission for valid user action', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.MOOD_ENTRY,
        Action.CREATE
      )
      
      expect(result.allowed).toBe(true)
      expect(result.reason).toBe('Permission granted')
    })

    it('should deny permission for invalid action', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.SYSTEM_CONFIG,
        Action.UPDATE
      )
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('does not have')
      expect(result.requiredPermissions).toBeTruthy()
      expect(result.userPermissions).toBeTruthy()
    })

    it('should deny permission for inactive user', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: false,
        lockedUntil: null,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.MOOD_ENTRY,
        Action.CREATE
      )
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('User account is inactive')
      expect(mockAuditService.logEvent).toHaveBeenCalled()
    })

    it('should deny permission for locked user', async () => {
      const context = createContext()
      const futureDate = new Date(Date.now() + 15 * 60 * 1000)
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: futureDate,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.MOOD_ENTRY,
        Action.CREATE
      )
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('User account is locked')
    })

    it('should allow access to expired lock', async () => {
      const context = createContext()
      const pastDate = new Date(Date.now() - 15 * 60 * 1000)
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: pastDate,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.MOOD_ENTRY,
        Action.CREATE
      )
      
      expect(result.allowed).toBe(true)
    })

    it('should use cache for repeated checks', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      // First call
      await rbacService.checkPermission(context, Resource.MOOD_ENTRY, Action.CREATE)
      
      // Second call should use cache
      const result = await rbacService.checkPermission(
        context,
        Resource.MOOD_ENTRY,
        Action.CREATE
      )
      
      expect(result.allowed).toBe(true)
      expect(result.reason).toContain('cached')
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1)
    })

    it('should skip cache when requested', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      // First call
      await rbacService.checkPermission(context, Resource.MOOD_ENTRY, Action.CREATE)
      
      // Second call with skipCache
      await rbacService.checkPermission(
        context,
        Resource.MOOD_ENTRY,
        Action.CREATE,
        true
      )
      
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2)
    })

    it('should handle ownership-based permissions', async () => {
      const ownerId = testUsers.regularUser.id
      const context = createContext({
        resourceId: 'resource-123',
        resourceOwnerId: ownerId,
      })
      
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.JOURNAL_ENTRY,
        Action.READ
      )
      
      expect(result.allowed).toBe(true)
    })

    it('should deny access to non-owned resources', async () => {
      const context = createContext({
        resourceId: 'resource-123',
        resourceOwnerId: 'different-user-id',
      })
      
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.JOURNAL_ENTRY,
        Action.READ
      )
      
      expect(result.allowed).toBe(false)
    })

    it('should log sensitive operations', async () => {
      const context = createContext({ userRole: 'THERAPIST' })
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      await rbacService.checkPermission(
        context,
        Resource.THERAPY_NOTE,
        Action.DELETE
      )
      
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: AuditEventCategory.PHI_ACCESS,
          action: 'PERMISSION_CHECK',
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))
      
      const result = await rbacService.checkPermission(
        context,
        Resource.MOOD_ENTRY,
        Action.CREATE
      )
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('system error')
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: AuditEventCategory.SYSTEM_ERROR,
          outcome: AuditOutcome.FAILURE,
        })
      )
    })
  })

  describe('checkPermissions', () => {
    it('should check multiple permissions', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      const permissions = [
        { resource: Resource.MOOD_ENTRY, action: Action.CREATE },
        { resource: Resource.JOURNAL_ENTRY, action: Action.CREATE },
        { resource: Resource.SYSTEM_CONFIG, action: Action.UPDATE },
      ]
      
      const results = await rbacService.checkPermissions(context, permissions)
      
      expect(results.size).toBe(3)
      expect(results.get('mood_entry:create')?.allowed).toBe(true)
      expect(results.get('journal_entry:create')?.allowed).toBe(true)
      expect(results.get('system_config:update')?.allowed).toBe(false)
    })
  })

  describe('canAccessResource', () => {
    it('should check resource access', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      const canAccess = await rbacService.canAccessResource(
        context,
        Resource.MOOD_ENTRY,
        'mood-entry-123'
      )
      
      expect(canAccess).toBe(true)
    })
  })

  describe('getUserPermissions', () => {
    it('should return user permissions for valid role', () => {
      const permissions = rbacService.getUserPermissions('USER')
      
      expect(permissions).toBeInstanceOf(Array)
      expect(permissions.length).toBeGreaterThan(0)
      expect(permissions).toContainEqual({
        resource: Resource.MOOD_ENTRY,
        action: Action.CREATE,
      })
    })

    it('should return empty array for invalid role', () => {
      const permissions = rbacService.getUserPermissions('INVALID_ROLE')
      
      expect(permissions).toEqual([])
    })
  })

  describe('getUserResources', () => {
    it('should return accessible resources for role', () => {
      const resources = rbacService.getUserResources('USER')
      
      expect(resources).toBeInstanceOf(Array)
      expect(resources).toContain(Resource.MOOD_ENTRY)
      expect(resources).toContain(Resource.JOURNAL_ENTRY)
      expect(resources).not.toContain(Resource.SYSTEM_CONFIG)
    })
  })

  describe('getUserActions', () => {
    it('should return available actions for resource', () => {
      const actions = rbacService.getUserActions('USER', Resource.MOOD_ENTRY)
      
      expect(actions).toBeInstanceOf(Array)
      expect(actions).toContain(Action.CREATE)
      expect(actions).toContain(Action.READ)
      expect(actions).toContain(Action.UPDATE)
      expect(actions).toContain(Action.DELETE)
    })

    it('should return empty array for inaccessible resource', () => {
      const actions = rbacService.getUserActions('USER', Resource.SYSTEM_CONFIG)
      
      expect(actions).toEqual([])
    })
  })

  describe('grantTemporaryPermission', () => {
    it('should create temporary permission', async () => {
      const permissionId = 'temp-perm-123'
      const tempPermission = {
        id: permissionId,
        userId: testUsers.regularUser.id,
        grantedBy: testUsers.adminUser.id,
        resource: Resource.ANALYTICS,
        action: Action.READ,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reason: 'One-time access for report review',
        isActive: true,
      }
      
      mockPrisma.temporaryPermission.create.mockResolvedValue(tempPermission)
      
      const result = await rbacService.grantTemporaryPermission({
        userId: testUsers.regularUser.id,
        grantedBy: testUsers.adminUser.id,
        resource: Resource.ANALYTICS,
        action: Action.READ,
        expiresAt: tempPermission.expiresAt,
        reason: tempPermission.reason,
      })
      
      expect(result).toBe(permissionId)
      expect(mockPrisma.temporaryPermission.create).toHaveBeenCalledWith({
        data: {
          userId: testUsers.regularUser.id,
          grantedBy: testUsers.adminUser.id,
          resource: Resource.ANALYTICS,
          action: Action.READ,
          expiresAt: tempPermission.expiresAt,
          reason: tempPermission.reason,
          isActive: true,
        },
      })
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: AuditEventCategory.PERMISSION_CHANGE,
          action: 'TEMPORARY_PERMISSION_GRANTED',
        })
      )
    })
  })

  describe('revokeTemporaryPermission', () => {
    it('should revoke temporary permission', async () => {
      const permissionId = 'temp-perm-123'
      const tempPermission = {
        id: permissionId,
        userId: testUsers.regularUser.id,
        resource: Resource.ANALYTICS,
        action: Action.READ,
        isActive: false,
        revokedAt: new Date(),
        revokedBy: testUsers.adminUser.id,
      }
      
      mockPrisma.temporaryPermission.update.mockResolvedValue(tempPermission)
      
      await rbacService.revokeTemporaryPermission(permissionId, testUsers.adminUser.id)
      
      expect(mockPrisma.temporaryPermission.update).toHaveBeenCalledWith({
        where: { id: permissionId },
        data: {
          isActive: false,
          revokedAt: expect.any(Date),
          revokedBy: testUsers.adminUser.id,
        },
      })
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: AuditEventCategory.PERMISSION_CHANGE,
          action: 'TEMPORARY_PERMISSION_REVOKED',
        })
      )
    })
  })

  describe('getTemporaryPermissions', () => {
    it('should return active temporary permissions', async () => {
      const tempPerms = [
        {
          id: 'temp-1',
          userId: testUsers.regularUser.id,
          resource: Resource.ANALYTICS,
          action: Action.READ,
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        {
          id: 'temp-2',
          userId: testUsers.regularUser.id,
          resource: Resource.AUDIT_LOG,
          action: Action.READ,
          isActive: true,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      ]
      
      mockPrisma.temporaryPermission.findMany.mockResolvedValue(tempPerms)
      
      const permissions = await rbacService.getTemporaryPermissions(testUsers.regularUser.id)
      
      expect(permissions).toHaveLength(2)
      expect(permissions).toContainEqual({
        resource: Resource.ANALYTICS,
        action: Action.READ,
      })
      expect(permissions).toContainEqual({
        resource: Resource.AUDIT_LOG,
        action: Action.READ,
      })
    })

    it('should exclude expired permissions', async () => {
      mockPrisma.temporaryPermission.findMany.mockResolvedValue([])
      
      const permissions = await rbacService.getTemporaryPermissions(testUsers.regularUser.id)
      
      expect(permissions).toEqual([])
      expect(mockPrisma.temporaryPermission.findMany).toHaveBeenCalledWith({
        where: {
          userId: testUsers.regularUser.id,
          isActive: true,
          expiresAt: {
            gt: expect.any(Date),
          },
        },
      })
    })
  })

  describe('validateRoleAssignment', () => {
    it('should validate valid role assignment by admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
      })
      
      const result = await rbacService.validateRoleAssignment(
        testUsers.regularUser.id,
        'HELPER',
        testUsers.adminUser.id
      )
      
      expect(result.valid).toBe(true)
    })

    it('should reject assignment of non-existent role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
      })
      
      const result = await rbacService.validateRoleAssignment(
        testUsers.regularUser.id,
        'INVALID_ROLE',
        testUsers.adminUser.id
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('does not exist')
    })

    it('should reject assignment by non-admin user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'USER',
      })
      
      const result = await rbacService.validateRoleAssignment(
        testUsers.regularUser.id,
        'HELPER',
        testUsers.regularUser.id
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Insufficient permissions')
    })

    it('should reject assignment of higher role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN', // Priority 90
      })
      
      const result = await rbacService.validateRoleAssignment(
        testUsers.regularUser.id,
        'SUPER_ADMIN', // Priority 100
        testUsers.adminUser.id
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('higher than your own')
    })

    it('should reject assignment when assigner not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      
      const result = await rbacService.validateRoleAssignment(
        testUsers.regularUser.id,
        'HELPER',
        'non-existent-user'
      )
      
      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Assigner not found')
    })

    it('should log clinical role assignments', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
      })
      
      await rbacService.validateRoleAssignment(
        testUsers.regularUser.id,
        'THERAPIST',
        testUsers.adminUser.id
      )
      
      expect(mockAuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          category: AuditEventCategory.PERMISSION_CHANGE,
          action: 'CLINICAL_ROLE_ASSIGNMENT',
          riskLevel: RiskLevel.HIGH,
        })
      )
    })
  })

  describe('Resource Owner Resolution', () => {
    it('should resolve journal entry owner', async () => {
      const context = createContext({ resourceId: 'journal-123' })
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      mockPrisma.journalEntry.findUnique.mockResolvedValue({
        userId: testUsers.regularUser.id,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.JOURNAL_ENTRY,
        Action.READ
      )
      
      expect(mockPrisma.journalEntry.findUnique).toHaveBeenCalledWith({
        where: { id: 'journal-123' },
        select: { userId: true },
      })
      expect(result.allowed).toBe(true)
    })

    it('should resolve mood entry owner', async () => {
      const context = createContext({ resourceId: 'mood-123' })
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      mockPrisma.moodEntry.findUnique.mockResolvedValue({
        userId: testUsers.regularUser.id,
      })
      
      await rbacService.checkPermission(context, Resource.MOOD_ENTRY, Action.READ)
      
      expect(mockPrisma.moodEntry.findUnique).toHaveBeenCalledWith({
        where: { id: 'mood-123' },
        select: { userId: true },
      })
    })

    it('should resolve community post owner', async () => {
      const context = createContext({ resourceId: 'post-123' })
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      mockPrisma.communityPost.findUnique.mockResolvedValue({
        authorId: testUsers.regularUser.id,
      })
      
      await rbacService.checkPermission(context, Resource.COMMUNITY_POST, Action.UPDATE)
      
      expect(mockPrisma.communityPost.findUnique).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        select: { authorId: true },
      })
    })

    it('should handle owner resolution errors gracefully', async () => {
      const context = createContext({ resourceId: 'invalid-123' })
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      mockPrisma.journalEntry.findUnique.mockRejectedValue(new Error('Not found'))
      
      // Should not throw, should continue with permission check
      const result = await rbacService.checkPermission(
        context,
        Resource.JOURNAL_ENTRY,
        Action.READ
      )
      
      expect(result.allowed).toBe(false) // No owner means no access
    })
  })

  describe('Cache Management', () => {
    it('should clear user-specific cache', () => {
      // This tests the private method indirectly through revoke
      const context = createContext()
      
      rbacService.clearCache()
      
      // Cache should be empty
      expect(rbacService['permissionCache'].size).toBe(0)
    })

    it('should limit cache size', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      // Make many permission checks to exceed cache limit
      for (let i = 0; i < 1005; i++) {
        await rbacService.checkPermission(
          { ...context, userId: `user-${i}` },
          Resource.MOOD_ENTRY,
          Action.CREATE
        )
      }
      
      // Cache should be limited to 1000 entries
      expect(rbacService['permissionCache'].size).toBeLessThanOrEqual(1000)
    })
  })

  describe('Role-based Permission Logic', () => {
    it('should allow therapist to access own therapy notes', async () => {
      const context = createContext({
        userRole: 'THERAPIST',
        resourceOwnerId: testUsers.therapistUser.id,
        userId: testUsers.therapistUser.id,
      })
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.THERAPY_NOTE,
        Action.READ
      )
      
      expect(result.allowed).toBe(true)
    })

    it('should deny therapist access to other therapist notes', async () => {
      const context = createContext({
        userRole: 'THERAPIST',
        userId: testUsers.therapistUser.id,
        resourceOwnerId: 'different-therapist-id',
      })
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.THERAPY_NOTE,
        Action.READ
      )
      
      expect(result.allowed).toBe(false)
    })

    it('should allow crisis counselor to access crisis reports', async () => {
      const context = createContext({
        userRole: 'CRISIS_COUNSELOR',
      })
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.CRISIS_REPORT,
        Action.READ
      )
      
      expect(result.allowed).toBe(true)
    })

    it('should allow admin to manage users', async () => {
      const context = createContext({
        userRole: 'ADMIN',
      })
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      const result = await rbacService.checkPermission(
        context,
        Resource.USER,
        Action.UPDATE
      )
      
      expect(result.allowed).toBe(true)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing user gracefully', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue(null)
      
      const result = await rbacService.checkPermission(
        context,
        Resource.MOOD_ENTRY,
        Action.CREATE
      )
      
      expect(result.allowed).toBe(false)
    })

    it('should handle invalid resource enum', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      // @ts-expect-error - Testing invalid enum
      const result = await rbacService.checkPermission(
        context,
        'INVALID_RESOURCE' as Resource,
        Action.READ
      )
      
      expect(result.allowed).toBe(false)
    })

    it('should handle invalid action enum', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      // @ts-expect-error - Testing invalid enum
      const result = await rbacService.checkPermission(
        context,
        Resource.MOOD_ENTRY,
        'INVALID_ACTION' as Action
      )
      
      expect(result.allowed).toBe(false)
    })

    it('should handle concurrent permission checks', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: true,
        lockedUntil: null,
      })
      
      const promises = Array(10).fill(null).map(() =>
        rbacService.checkPermission(context, Resource.MOOD_ENTRY, Action.CREATE)
      )
      
      const results = await Promise.all(promises)
      
      results.forEach(result => {
        expect(result.allowed).toBe(true)
      })
    })

    it('should handle audit service failures gracefully', async () => {
      const context = createContext()
      mockPrisma.user.findUnique.mockResolvedValue({
        isActive: false,
        lockedUntil: null,
      })
      mockAuditService.logEvent.mockRejectedValue(new Error('Audit failed'))
      
      // Should not throw even if audit fails
      const result = await rbacService.checkPermission(
        context,
        Resource.MOOD_ENTRY,
        Action.CREATE
      )
      
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('User account is inactive')
    })
  })
})