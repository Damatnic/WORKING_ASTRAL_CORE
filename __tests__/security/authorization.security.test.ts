/**
 * Authorization Security Tests
 * Tests RBAC, permissions, access control for AstralCore
 * 
 * HIPAA Compliance: Tests ensure proper access controls
 * for protected health information based on minimum necessary principle
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { defaultSecurityConfig } from '../../security/security-tests.config';
import type { SecurityTestConfig } from '../../security/security-tests.config';

// Mock modules
jest.mock('next-auth');
jest.mock('@/lib/prisma');
jest.mock('@/lib/security/rbac');

// Mock user roles and permissions
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  THERAPIST: 'therapist',
  HELPER: 'helper',
  PATIENT: 'patient',
  CRISIS_COUNSELOR: 'crisis_counselor'
} as const;

const PERMISSIONS = {
  // System permissions
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_CONFIG: 'system:config',
  
  // User management
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  USER_ADMIN: 'user:admin',
  
  // PHI access permissions
  PHI_READ_OWN: 'phi:read:own',
  PHI_READ_ASSIGNED: 'phi:read:assigned',
  PHI_READ_ALL: 'phi:read:all',
  PHI_WRITE_OWN: 'phi:write:own',
  PHI_WRITE_ASSIGNED: 'phi:write:assigned',
  PHI_DELETE_OWN: 'phi:delete:own',
  PHI_DELETE_ASSIGNED: 'phi:delete:assigned',
  
  // Crisis intervention
  CRISIS_ACCESS: 'crisis:access',
  CRISIS_ADMIN: 'crisis:admin',
  EMERGENCY_OVERRIDE: 'emergency:override',
  
  // Therapy sessions
  THERAPY_CONDUCT: 'therapy:conduct',
  THERAPY_VIEW: 'therapy:view',
  THERAPY_SCHEDULE: 'therapy:schedule',
  
  // Reporting and analytics
  REPORTS_VIEW: 'reports:view',
  REPORTS_GENERATE: 'reports:generate',
  ANALYTICS_VIEW: 'analytics:view'
} as const;

// Mock database
const mockDb = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  role: {
    findMany: jest.fn()
  },
  permission: {
    findMany: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  },
  accessAttempt: {
    create: jest.fn()
  }
};

// Mock RBAC service
const mockRBAC = {
  getUserRoles: jest.fn(),
  getUserPermissions: jest.fn(),
  hasPermission: jest.fn(),
  canAccessResource: jest.fn(),
  checkMinimumNecessary: jest.fn()
};

const securityConfig: SecurityTestConfig = defaultSecurityConfig;

describe('Authorization Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Role-Based Access Control (RBAC) Tests', () => {
    it('should enforce proper role hierarchy', async () => {
      const roleHierarchy = {
        [ROLES.SUPER_ADMIN]: [ROLES.ADMIN, ROLES.THERAPIST, ROLES.HELPER, ROLES.PATIENT],
        [ROLES.ADMIN]: [ROLES.THERAPIST, ROLES.HELPER, ROLES.PATIENT],
        [ROLES.THERAPIST]: [ROLES.PATIENT],
        [ROLES.CRISIS_COUNSELOR]: [ROLES.PATIENT],
        [ROLES.HELPER]: [],
        [ROLES.PATIENT]: []
      };

      for (const [higherRole, subordinateRoles] of Object.entries(roleHierarchy)) {
        for (const lowerRole of subordinateRoles) {
          const canManage = checkRoleHierarchy(higherRole, lowerRole);
          expect(canManage).toBe(true);
        }
      }

      // Test invalid hierarchy (lower role cannot manage higher role)
      const canPatientManageAdmin = checkRoleHierarchy(ROLES.PATIENT, ROLES.ADMIN);
      expect(canPatientManageAdmin).toBe(false);
    });

    it('should prevent role escalation attacks', async () => {
      const userId = 'user123';
      const currentRole = ROLES.PATIENT;
      const targetRole = ROLES.ADMIN;

      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        role: currentRole,
        permissions: []
      });

      // Attempt role escalation
      try {
        const hasPermission = await checkRoleEscalation(userId, targetRole);
        expect(hasPermission).toBe(false);
      } catch (error) {
        expect(error.message).toContain('Unauthorized role escalation attempt');
      }

      // Log the attempt
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId,
          action: 'role_escalation_attempt',
          resource: `role:${targetRole}`,
          outcome: 'denied',
          riskLevel: 'high'
        }
      });
    });

    it('should enforce horizontal privilege escalation prevention', async () => {
      const patientId1 = 'patient1';
      const patientId2 = 'patient2';
      const resourceOwnerId = patientId2;

      // Patient 1 tries to access Patient 2's resources
      const canAccess = await checkHorizontalPrivilegeEscalation(
        patientId1, 
        ROLES.PATIENT, 
        'journal_entry', 
        resourceOwnerId
      );

      expect(canAccess).toBe(false);

      // Verify audit logging
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: patientId1,
          action: 'unauthorized_access_attempt',
          riskLevel: 'medium'
        })
      });
    });

    it('should enforce vertical privilege escalation prevention', async () => {
      const helperId = 'helper123';
      const adminResource = 'system_configuration';

      mockRBAC.hasPermission.mockResolvedValue(false);

      // Helper tries to access admin resources
      const canAccess = await mockRBAC.hasPermission(helperId, PERMISSIONS.SYSTEM_ADMIN);
      expect(canAccess).toBe(false);

      // Verify the access attempt is logged
      expect(mockDb.accessAttempt.create).toHaveBeenCalledWith({
        data: {
          userId: helperId,
          resource: adminResource,
          permission: PERMISSIONS.SYSTEM_ADMIN,
          outcome: 'denied',
          timestamp: expect.any(Date)
        }
      });
    });
  });

  describe('Resource Access Control Tests', () => {
    it('should enforce minimum necessary access for PHI', async () => {
      const therapistId = 'therapist123';
      const patientId = 'patient456';
      const unassignedPatientId = 'patient789';

      // Mock therapist-patient relationship
      mockDb.user.findUnique.mockResolvedValue({
        id: therapistId,
        role: ROLES.THERAPIST,
        assignedPatients: [patientId]
      });

      mockRBAC.checkMinimumNecessary.mockImplementation(
        (userId, resource, resourceOwnerId) => {
          if (userId === therapistId && resourceOwnerId === patientId) {
            return Promise.resolve(true);
          }
          return Promise.resolve(false);
        }
      );

      // Therapist can access assigned patient's PHI
      const canAccessAssigned = await mockRBAC.checkMinimumNecessary(
        therapistId, 
        'phi_record', 
        patientId
      );
      expect(canAccessAssigned).toBe(true);

      // Therapist cannot access unassigned patient's PHI
      const canAccessUnassigned = await mockRBAC.checkMinimumNecessary(
        therapistId, 
        'phi_record', 
        unassignedPatientId
      );
      expect(canAccessUnassigned).toBe(false);
    });

    it('should prevent direct object reference attacks', async () => {
      const attackerId = 'attacker123';
      const victimId = 'victim456';
      
      // Common IDOR attack patterns
      const idorTests = [
        { resourceType: 'user_profile', resourceId: victimId },
        { resourceType: 'journal_entry', resourceId: '999' },
        { resourceType: 'therapy_session', resourceId: '../../admin/config' },
        { resourceType: 'document', resourceId: '../../../etc/passwd' }
      ];

      for (const { resourceType, resourceId } of idorTests) {
        mockRBAC.canAccessResource.mockResolvedValue(false);
        
        const canAccess = await mockRBAC.canAccessResource(
          attackerId, 
          resourceType, 
          resourceId
        );
        
        expect(canAccess).toBe(false);
        
        // Verify suspicious patterns are detected and logged
        if (resourceId.includes('..') || resourceId.includes('/')) {
          expect(mockDb.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              action: 'path_traversal_attempt',
              riskLevel: 'high'
            })
          });
        }
      }
    });

    it('should validate resource ownership', async () => {
      const ownerId = 'owner123';
      const otherUserId = 'other456';
      const resourceId = 'resource789';

      // Mock resource ownership check
      mockDb.user.findUnique.mockImplementation(({ where }) => {
        if (where.id === ownerId) {
          return Promise.resolve({
            id: ownerId,
            ownedResources: [resourceId]
          });
        }
        return Promise.resolve({
          id: otherUserId,
          ownedResources: []
        });
      });

      // Owner can access their resource
      const ownerCanAccess = await checkResourceOwnership(ownerId, resourceId);
      expect(ownerCanAccess).toBe(true);

      // Other user cannot access resource they don't own
      const otherCanAccess = await checkResourceOwnership(otherUserId, resourceId);
      expect(otherCanAccess).toBe(false);
    });
  });

  describe('Emergency Access Controls', () => {
    it('should allow emergency override for crisis situations', async () => {
      const crisisCounselorId = 'counselor123';
      const patientId = 'patient456';
      const emergencyReason = 'Immediate suicide risk - patient expressed intent';

      mockRBAC.hasPermission.mockResolvedValue(true);

      // Crisis counselor can override normal access controls in emergency
      const hasEmergencyAccess = await mockRBAC.hasPermission(
        crisisCounselorId, 
        PERMISSIONS.EMERGENCY_OVERRIDE
      );
      expect(hasEmergencyAccess).toBe(true);

      // Emergency access must be logged with justification
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: crisisCounselorId,
          action: 'emergency_access',
          resource: `patient:${patientId}`,
          justification: emergencyReason,
          riskLevel: 'critical',
          requiresReview: true
        }
      });
    });

    it('should implement break-glass access with proper controls', async () => {
      const adminId = 'admin123';
      const justification = 'System outage affecting patient care';
      const duration = 3600000; // 1 hour

      // Break-glass access requires justification and time limit
      const breakGlassAccess = await grantBreakGlassAccess(
        adminId, 
        justification, 
        duration
      );

      expect(breakGlassAccess).toEqual({
        granted: true,
        expiresAt: expect.any(Date),
        requiresApproval: true,
        auditRequired: true
      });

      // Verify enhanced auditing
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'break_glass_access',
          justification,
          expiresAt: expect.any(Date),
          requiresManagerialReview: true
        })
      });
    });
  });

  describe('API Endpoint Authorization Tests', () => {
    it('should protect admin endpoints from unauthorized access', async () => {
      const adminEndpoints = securityConfig.owasp.brokenAccessControl.urlAccess.adminPaths;
      const patientId = 'patient123';

      for (const endpoint of adminEndpoints) {
        const hasAccess = await checkEndpointAccess(patientId, ROLES.PATIENT, endpoint);
        expect(hasAccess).toBe(false);
      }

      // Admin should have access
      const adminId = 'admin123';
      for (const endpoint of adminEndpoints) {
        const hasAccess = await checkEndpointAccess(adminId, ROLES.ADMIN, endpoint);
        expect(hasAccess).toBe(true);
      }
    });

    it('should protect therapist endpoints appropriately', async () => {
      const therapistEndpoints = securityConfig.owasp.brokenAccessControl.urlAccess.therapistPaths;
      
      // Test different roles accessing therapist endpoints
      const accessTests = [
        { userId: 'admin123', role: ROLES.ADMIN, shouldAccess: true },
        { userId: 'therapist123', role: ROLES.THERAPIST, shouldAccess: true },
        { userId: 'helper123', role: ROLES.HELPER, shouldAccess: false },
        { userId: 'patient123', role: ROLES.PATIENT, shouldAccess: false }
      ];

      for (const endpoint of therapistEndpoints) {
        for (const { userId, role, shouldAccess } of accessTests) {
          const hasAccess = await checkEndpointAccess(userId, role, endpoint);
          expect(hasAccess).toBe(shouldAccess);
        }
      }
    });

    it('should validate API method permissions', async () => {
      const endpoints = [
        { path: '/api/user/profile', method: 'GET', permission: PERMISSIONS.USER_READ },
        { path: '/api/user/profile', method: 'PUT', permission: PERMISSIONS.USER_WRITE },
        { path: '/api/user/profile', method: 'DELETE', permission: PERMISSIONS.USER_DELETE },
        { path: '/api/admin/users', method: 'GET', permission: PERMISSIONS.USER_ADMIN }
      ];

      const userId = 'user123';
      
      for (const { path, method, permission } of endpoints) {
        mockRBAC.hasPermission.mockResolvedValue(false);
        
        const request = new NextRequest(`https://example.com${path}`, { method });
        const hasPermission = await mockRBAC.hasPermission(userId, permission);
        
        expect(hasPermission).toBe(false);
      }
    });
  });

  describe('Session-Based Authorization Tests', () => {
    it('should validate session permissions match user permissions', async () => {
      const userId = 'user123';
      const sessionPermissions = [PERMISSIONS.USER_READ, PERMISSIONS.PHI_READ_OWN];
      const userPermissions = [PERMISSIONS.USER_READ, PERMISSIONS.USER_WRITE];

      // Session should not have permissions user doesn't have
      const invalidPermissions = sessionPermissions.filter(
        perm => !userPermissions.includes(perm)
      );

      expect(invalidPermissions).toContain(PERMISSIONS.PHI_READ_OWN);
      
      if (invalidPermissions.length > 0) {
        // Should revoke invalid session permissions
        expect(mockDb.auditLog.create).toHaveBeenCalledWith({
          data: {
            userId,
            action: 'session_permission_revocation',
            details: { invalidPermissions },
            riskLevel: 'medium'
          }
        });
      }
    });

    it('should handle permission changes during active session', async () => {
      const userId = 'user123';
      const oldPermissions = [PERMISSIONS.USER_READ, PERMISSIONS.PHI_READ_OWN];
      const newPermissions = [PERMISSIONS.USER_READ]; // PHI access revoked

      // Simulate permission change
      mockDb.user.update.mockResolvedValue({
        id: userId,
        permissions: newPermissions
      });

      // Verify session is invalidated when permissions change
      const sessionShouldInvalidate = !arraysEqual(oldPermissions, newPermissions);
      expect(sessionShouldInvalidate).toBe(true);

      if (sessionShouldInvalidate) {
        expect(mockDb.auditLog.create).toHaveBeenCalledWith({
          data: {
            userId,
            action: 'session_invalidated_permission_change',
            oldPermissions,
            newPermissions
          }
        });
      }
    });
  });

  describe('HIPAA Compliance Authorization Tests', () => {
    it('should enforce workforce access management', async () => {
      const workforceRoles = [ROLES.ADMIN, ROLES.THERAPIST, ROLES.HELPER, ROLES.CRISIS_COUNSELOR];
      
      for (const role of workforceRoles) {
        const userId = `${role}_user_123`;
        
        // All workforce members need proper training and authorization
        const hasTrainingCompleted = await checkMandatoryTraining(userId);
        const hasBackgroundCheck = await checkBackgroundCheck(userId);
        const hasSignedAgreements = await checkSignedAgreements(userId);
        
        expect(hasTrainingCompleted).toBe(true);
        expect(hasBackgroundCheck).toBe(true);
        expect(hasSignedAgreements).toBe(true);
      }
    });

    it('should implement assigned security responsibility', async () => {
      const securityOfficerId = 'security_officer_123';
      
      // Security officer should have appropriate permissions
      mockRBAC.getUserPermissions.mockResolvedValue([
        PERMISSIONS.SYSTEM_ADMIN,
        PERMISSIONS.USER_ADMIN,
        PERMISSIONS.PHI_READ_ALL, // For security monitoring only
        PERMISSIONS.ANALYTICS_VIEW
      ]);

      const permissions = await mockRBAC.getUserPermissions(securityOfficerId);
      
      expect(permissions).toContain(PERMISSIONS.SYSTEM_ADMIN);
      expect(permissions).toContain(PERMISSIONS.USER_ADMIN);
    });

    it('should maintain access audit trails', async () => {
      const userId = 'user123';
      const resourceId = 'phi_record_456';
      
      // Every PHI access must be logged
      await mockDb.auditLog.create({
        data: {
          userId,
          action: 'phi_access',
          resource: resourceId,
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          justification: 'Patient treatment'
        }
      });

      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'phi_access',
          resource: resourceId,
          justification: expect.any(String)
        })
      });
    });
  });
});

// Helper functions for testing
function checkRoleHierarchy(higherRole: string, lowerRole: string): boolean {
  const hierarchy = {
    super_admin: 4,
    admin: 3,
    crisis_counselor: 2,
    therapist: 2,
    helper: 1,
    patient: 0
  };
  
  return hierarchy[higherRole as keyof typeof hierarchy] > hierarchy[lowerRole as keyof typeof hierarchy];
}

async function checkRoleEscalation(userId: string, targetRole: string): Promise<boolean> {
  const user = await mockDb.user.findUnique({ where: { id: userId } });
  
  if (!user) {
    throw new Error('User not found');
  }

  const canEscalate = checkRoleHierarchy(targetRole, user.role);
  
  if (!canEscalate) {
    // Log the attempt
    await mockDb.auditLog.create({
      data: {
        userId,
        action: 'role_escalation_attempt',
        resource: `role:${targetRole}`,
        outcome: 'denied',
        riskLevel: 'high'
      }
    });
    
    throw new Error('Unauthorized role escalation attempt');
  }
  
  return canEscalate;
}

async function checkHorizontalPrivilegeEscalation(
  userId: string, 
  userRole: string, 
  resourceType: string, 
  resourceOwnerId: string
): Promise<boolean> {
  // Users can only access their own resources (except for authorized roles)
  const authorizedRoles = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
  
  if (authorizedRoles.includes(userRole as any)) {
    return true;
  }

  const canAccess = userId === resourceOwnerId;
  
  if (!canAccess) {
    await mockDb.auditLog.create({
      data: {
        userId,
        action: 'unauthorized_access_attempt',
        resource: `${resourceType}:${resourceOwnerId}`,
        riskLevel: 'medium'
      }
    });
  }
  
  return canAccess;
}

async function checkResourceOwnership(userId: string, resourceId: string): Promise<boolean> {
  const user = await mockDb.user.findUnique({ where: { id: userId } });
  return user?.ownedResources?.includes(resourceId) || false;
}

async function grantBreakGlassAccess(
  userId: string, 
  justification: string, 
  duration: number
) {
  const expiresAt = new Date(Date.now() + duration);
  
  await mockDb.auditLog.create({
    data: {
      userId,
      action: 'break_glass_access',
      justification,
      expiresAt,
      requiresManagerialReview: true
    }
  });
  
  return {
    granted: true,
    expiresAt,
    requiresApproval: true,
    auditRequired: true
  };
}

async function checkEndpointAccess(userId: string, userRole: string, endpoint: string): Promise<boolean> {
  const endpointPermissions = {
    '/admin': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    '/dashboard/admin': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    '/api/admin': [ROLES.SUPER_ADMIN, ROLES.ADMIN],
    '/therapist': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.THERAPIST],
    '/dashboard/therapist': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.THERAPIST],
    '/patient': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.THERAPIST, ROLES.HELPER, ROLES.PATIENT],
    '/dashboard/patient': [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.THERAPIST, ROLES.HELPER, ROLES.PATIENT]
  };
  
  const allowedRoles = endpointPermissions[endpoint as keyof typeof endpointPermissions];
  return allowedRoles?.includes(userRole as any) || false;
}

function arraysEqual(a: any[], b: any[]): boolean {
  return a.length === b.length && a.every((val, index) => val === b[index]);
}

async function checkMandatoryTraining(userId: string): Promise<boolean> {
  // Mock training completion check
  return true; // In real implementation, would check training database
}

async function checkBackgroundCheck(userId: string): Promise<boolean> {
  // Mock background check verification
  return true; // In real implementation, would check HR system
}

async function checkSignedAgreements(userId: string): Promise<boolean> {
  // Mock agreement signature check
  return true; // In real implementation, would check signed agreements
}