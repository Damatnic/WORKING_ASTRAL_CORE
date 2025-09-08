/**
 * Role-Based Access Control (RBAC) System
 * Implements hierarchical permissions with fine-grained access control
 * Follows principle of least privilege for healthcare compliance
 */

import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createHash } from 'crypto';
import { cache } from 'react';

// Permission categories for organized management
export const PermissionCategories = {
  USER: 'user',
  CONTENT: 'content',
  CLINICAL: 'clinical',
  CRISIS: 'crisis',
  ADMIN: 'admin',
  SYSTEM: 'system',
  SECURITY: 'security',
  ANALYTICS: 'analytics',
  COMMUNICATION: 'communication',
  MODERATION: 'moderation'
} as const;

// Granular permissions for fine-grained access control
export const Permissions = {
  // User permissions
  'user:read:own': 'Read own user data',
  'user:update:own': 'Update own profile',
  'user:delete:own': 'Delete own account',
  'user:read:any': 'Read any user data',
  'user:update:any': 'Update any user profile',
  'user:delete:any': 'Delete any user account',
  
  // Content permissions
  'content:create:own': 'Create own content',
  'content:read:own': 'Read own content',
  'content:update:own': 'Update own content',
  'content:delete:own': 'Delete own content',
  'content:read:public': 'Read public content',
  'content:moderate': 'Moderate content',
  
  // Clinical permissions
  'clinical:notes:create': 'Create clinical notes',
  'clinical:notes:read': 'Read clinical notes',
  'clinical:notes:update': 'Update clinical notes',
  'clinical:assessment:perform': 'Perform clinical assessments',
  'clinical:treatment:plan': 'Create treatment plans',
  'clinical:prescription:write': 'Write prescriptions',
  
  // Crisis permissions
  'crisis:respond': 'Respond to crisis situations',
  'crisis:escalate': 'Escalate crisis cases',
  'crisis:tools:access': 'Access crisis intervention tools',
  'crisis:emergency:contact': 'Contact emergency services',
  'crisis:report:file': 'File crisis reports',
  'crisis:override:access': 'Emergency access override',
  
  // Admin permissions
  'admin:users:manage': 'Manage user accounts',
  'admin:roles:assign': 'Assign user roles',
  'admin:permissions:grant': 'Grant permissions',
  'admin:content:moderate': 'Moderate platform content',
  'admin:analytics:view': 'View platform analytics',
  'admin:reports:generate': 'Generate admin reports',
  
  // System permissions
  'system:config:read': 'Read system configuration',
  'system:config:update': 'Update system configuration',
  'system:backup:create': 'Create system backups',
  'system:logs:read': 'Read system logs',
  'system:maintenance:perform': 'Perform system maintenance',
  'system:security:audit': 'Perform security audits',
  
  // Communication permissions
  'message:send': 'Send messages',
  'message:receive': 'Receive messages',
  'session:create': 'Create support sessions',
  'session:join': 'Join support sessions',
  'session:moderate': 'Moderate sessions',
  
  // Special permissions
  'emergency:access': 'Emergency access to all resources',
  'audit:bypass': 'Bypass audit logging',
  'mfa:bypass': 'Bypass MFA requirements'
} as const;

export type Permission = keyof typeof Permissions;

// Role hierarchy with permission inheritance
export const RoleHierarchy: Record<UserRole, {
  level: number;
  inherits: UserRole[];
  permissions: Permission[];
  requiresMFA: boolean;
  sessionTimeout: number; // in minutes
  maxConcurrentSessions: number;
}> = {
  [UserRole.USER]: {
    level: 1,
    inherits: [],
    permissions: [
      'user:read:own',
      'user:update:own',
      'content:create:own',
      'content:read:own',
      'content:update:own',
      'content:delete:own',
      'content:read:public',
      'message:send',
      'message:receive'
    ],
    requiresMFA: false,
    sessionTimeout: 60, // 1 hour
    maxConcurrentSessions: 3
  },
  
  [UserRole.HELPER]: {
    level: 2,
    inherits: [UserRole.USER],
    permissions: [
      'session:create',
      'session:join',
      'crisis:respond'
    ],
    requiresMFA: false,
    sessionTimeout: 120, // 2 hours
    maxConcurrentSessions: 2
  },
  
  [UserRole.THERAPIST]: {
    level: 3,
    inherits: [UserRole.HELPER],
    permissions: [
      'clinical:notes:create',
      'clinical:notes:read',
      'clinical:notes:update',
      'clinical:assessment:perform',
      'clinical:treatment:plan',
      'session:moderate'
    ],
    requiresMFA: true,
    sessionTimeout: 30, // 30 minutes for security
    maxConcurrentSessions: 1
  },
  
  [UserRole.CRISIS_COUNSELOR]: {
    level: 3,
    inherits: [UserRole.HELPER],
    permissions: [
      'crisis:escalate',
      'crisis:tools:access',
      'crisis:emergency:contact',
      'crisis:report:file',
      'crisis:override:access'
    ],
    requiresMFA: true,
    sessionTimeout: 30, // 30 minutes for security
    maxConcurrentSessions: 1
  },
  
  [UserRole.ADMIN]: {
    level: 4,
    inherits: [UserRole.USER],
    permissions: [
      'admin:users:manage',
      'admin:content:moderate',
      'admin:analytics:view',
      'admin:reports:generate',
      'content:moderate',
      'session:moderate',
      'user:read:any'
    ],
    requiresMFA: true,
    sessionTimeout: 45, // 45 minutes
    maxConcurrentSessions: 1
  },
  
  [UserRole.SUPER_ADMIN]: {
    level: 5,
    inherits: [UserRole.ADMIN, UserRole.THERAPIST, UserRole.CRISIS_COUNSELOR],
    permissions: [
      'admin:roles:assign',
      'admin:permissions:grant',
      'system:config:read',
      'system:config:update',
      'system:backup:create',
      'system:logs:read',
      'system:maintenance:perform',
      'system:security:audit',
      'user:update:any',
      'user:delete:any',
      'emergency:access'
    ],
    requiresMFA: true,
    sessionTimeout: 15, // 15 minutes for maximum security
    maxConcurrentSessions: 1
  }
};

/**
 * Resource-level access control
 * Defines who can access what resources under which conditions
 */
export interface ResourceAccessRule {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  conditions?: {
    ownership?: boolean; // Must own the resource
    department?: string[]; // Must be in specific department
    timeWindow?: { start: string; end: string }; // Time-based access
    ipWhitelist?: string[]; // IP restrictions
    requiresMFA?: boolean; // Requires MFA for this specific action
    auditLevel?: 'none' | 'basic' | 'detailed' | 'forensic';
  };
}

/**
 * Dynamic permission grant
 * For temporary or emergency access
 */
export interface PermissionGrant {
  id: string;
  userId: string;
  permissions: Permission[];
  grantedBy: string;
  reason: string;
  expiresAt: Date;
  conditions?: {
    maxUses?: number;
    ipRestriction?: string[];
    requiresApproval?: boolean;
    emergencyAccess?: boolean;
  };
}

/**
 * Check if a user has a specific permission
 * Includes inheritance and dynamic grants
 */
export const hasPermission = cache(async (
  userId: string,
  permission: Permission,
  context?: {
    resourceId?: string;
    resourceType?: string;
    ipAddress?: string;
  }
): Promise<boolean> => {
  try {
    // Get user with roles and permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        permissions: true,
        isActive: true,
        isTwoFactorEnabled: true
      }
    });

    if (!user || !user.isActive) {
      return false;
    }

    // Check for super admin emergency access
    if (user.role === UserRole.SUPER_ADMIN && 
        RoleHierarchy[UserRole.SUPER_ADMIN].permissions.includes('emergency:access')) {
      // Log emergency access usage
      await logSecurityEvent({
        userId,
        action: 'emergency_access_used',
        resource: context?.resourceType || 'unknown',
        resourceId: context?.resourceId,
        details: { permission },
        outcome: 'success'
      });
      return true;
    }

    // Get all permissions for the user's role (including inherited)
    const allPermissions = getAllPermissionsForRole(user.role);
    
    // Check if permission exists in role permissions
    if (allPermissions.includes(permission)) {
      return true;
    }

    // Check for custom permissions assigned to user
    if (user.permissions.includes(permission)) {
      return true;
    }

    // Check for dynamic permission grants
    const grants = await (prisma as any).permissionGrant.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        revoked: false
      }
    });

    for (const grant of grants) {
      const grantPermissions = grant.permissions as Permission[];
      if (grantPermissions.includes(permission)) {
        // Check grant conditions
        if (grant.conditions) {
          const conditions = grant.conditions as any;
          
          // Check IP restriction
          if (conditions.ipRestriction && context?.ipAddress) {
            if (!conditions.ipRestriction.includes(context.ipAddress)) {
              continue;
            }
          }
          
          // Check max uses
          if (conditions.maxUses !== undefined) {
            const uses = await (prisma as any).permissionGrantUse.count({
              where: { grantId: grant.id }
            });
            if (uses >= conditions.maxUses) {
              continue;
            }
          }
        }

        // Log permission grant usage
        await (prisma as any).permissionGrantUse.create({
          data: {
            grantId: grant.id,
            usedAt: new Date(),
            context: context || {}
          }
        });

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Permission check error:', error);
    // Fail closed - deny access on error
    return false;
  }
});

/**
 * Get all permissions for a role including inherited permissions
 */
export function getAllPermissionsForRole(role: UserRole): Permission[] {
  const roleConfig = RoleHierarchy[role];
  if (!roleConfig) return [];

  const permissions = new Set<Permission>(roleConfig.permissions);

  // Add inherited permissions
  for (const inheritedRole of roleConfig.inherits) {
    const inheritedPermissions = getAllPermissionsForRole(inheritedRole);
    inheritedPermissions.forEach(p => permissions.add(p));
  }

  return Array.from(permissions);
}

/**
 * Check if a role can perform an action on a resource
 */
export async function canAccessResource(
  userId: string,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete',
  resourceOwnerId?: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        permissions: true
      }
    });

    if (!user) return false;

    // Check ownership-based permissions
    if (resourceOwnerId === userId) {
      // User can access their own resources
      const ownPermission = `${resource}:${action}:own` as Permission;
      if (await hasPermission(userId, ownPermission)) {
        return true;
      }
    }

    // Check any-resource permissions
    const anyPermission = `${resource}:${action}:any` as Permission;
    if (await hasPermission(userId, anyPermission)) {
      return true;
    }

    // Check for emergency access
    if (await hasPermission(userId, 'emergency:access' as Permission)) {
      await logSecurityEvent({
        userId,
        action: 'resource_access_emergency',
        resource,
        resourceId: resourceOwnerId,
        details: { action },
        outcome: 'success'
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Resource access check error:', error);
    return false;
  }
}

/**
 * Grant temporary permissions to a user
 */
export async function grantTemporaryPermission(
  userId: string,
  permissions: Permission[],
  grantedBy: string,
  reason: string,
  duration: number, // in minutes
  conditions?: PermissionGrant['conditions']
): Promise<PermissionGrant> {
  const grant = await (prisma as any).permissionGrant.create({
    data: {
      userId,
      permissions,
      grantedBy,
      reason,
      expiresAt: new Date(Date.now() + duration * 60 * 1000),
      conditions: conditions || {},
      createdAt: new Date()
    }
  });

  // Log the permission grant
  await logSecurityEvent({
    userId: grantedBy,
    action: 'permission_granted',
    resource: 'permission_grant',
    resourceId: grant.id,
    details: {
      targetUserId: userId,
      permissions,
      reason,
      duration,
      conditions
    },
    outcome: 'success'
  });

  return grant as PermissionGrant;
}

/**
 * Revoke a permission grant
 */
export async function revokePermissionGrant(
  grantId: string,
  revokedBy: string,
  reason: string
): Promise<void> {
  await (prisma as any).permissionGrant.update({
    where: { id: grantId },
    data: {
      revoked: true,
      revokedBy,
      revokedReason: reason,
      revokedAt: new Date()
    }
  });

  await logSecurityEvent({
    userId: revokedBy,
    action: 'permission_revoked',
    resource: 'permission_grant',
    resourceId: grantId,
    details: { reason },
    outcome: 'success'
  });
}

/**
 * Log security events for audit trail
 */
export async function logSecurityEvent(event: {
  userId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  outcome: 'success' | 'failure' | 'warning';
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        id: createHash('sha256').update(`${Date.now()}-${event.userId}-${Math.random()}`).digest('hex'),
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        details: event.details || {},
        outcome: event.outcome,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
    // Don't throw - logging failures shouldn't break the application
  }
}

/**
 * Check if user requires MFA for their role
 */
export function requiresMFA(role: UserRole): boolean {
  return RoleHierarchy[role]?.requiresMFA || false;
}

/**
 * Get session timeout for role
 */
export function getSessionTimeout(role: UserRole): number {
  return RoleHierarchy[role]?.sessionTimeout || 60; // Default 60 minutes
}

/**
 * Get max concurrent sessions for role
 */
export function getMaxConcurrentSessions(role: UserRole): number {
  return RoleHierarchy[role]?.maxConcurrentSessions || 1;
}

/**
 * Validate role transition
 * Ensures users can only be promoted/demoted following hierarchy rules
 */
export function canTransitionRole(
  currentRole: UserRole,
  newRole: UserRole,
  performerRole: UserRole
): boolean {
  const currentLevel = RoleHierarchy[currentRole]?.level || 0;
  const newLevel = RoleHierarchy[newRole]?.level || 0;
  const performerLevel = RoleHierarchy[performerRole]?.level || 0;

  // Super admin can change any role
  if (performerRole === UserRole.SUPER_ADMIN) {
    return true;
  }

  // Admin can only manage roles below their level
  if (performerRole === UserRole.ADMIN) {
    return newLevel < performerLevel && currentLevel < performerLevel;
  }

  // Others cannot change roles
  return false;
}

/**
 * Emergency access procedure
 * For critical situations requiring immediate access
 */
export async function requestEmergencyAccess(
  userId: string,
  reason: string,
  resources: string[],
  duration: number = 15 // minutes
): Promise<{ granted: boolean; token?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isTwoFactorEnabled: true
      }
    });

    if (!user) {
      return { granted: false };
    }

    // Only certain roles can request emergency access
    const allowedRoles = [
      UserRole.CRISIS_COUNSELOR,
      UserRole.THERAPIST,
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN
    ];

    if (!allowedRoles.includes(user.role)) {
      await logSecurityEvent({
        userId,
        action: 'emergency_access_denied',
        details: { reason: 'insufficient_role' },
        outcome: 'failure'
      });
      return { granted: false };
    }

    // Create emergency access token
    const token = createHash('sha256')
      .update(`${userId}-${Date.now()}-${Math.random()}`)
      .digest('hex');

    // Grant emergency permissions
    await (prisma as any).emergencyAccess.create({
      data: {
        userId,
        token,
        reason,
        resources,
        expiresAt: new Date(Date.now() + duration * 60 * 1000),
        createdAt: new Date()
      }
    });

    // Log emergency access request
    await logSecurityEvent({
      userId,
      action: 'emergency_access_granted',
      details: {
        reason,
        resources,
        duration
      },
      outcome: 'success'
    });

    // Send alerts to administrators
    await notifyEmergencyAccess(userId, reason, resources);

    return { granted: true, token };
  } catch (error) {
    console.error('Emergency access error:', error);
    return { granted: false };
  }
}

/**
 * Notify administrators of emergency access
 */
async function notifyEmergencyAccess(
  userId: string,
  reason: string,
  resources: string[]
): Promise<void> {
  // Implementation would send notifications to admins
  // This is a placeholder for the actual notification system
  console.log('Emergency access notification:', { userId, reason, resources });
}

const RBACUtilities = {
  hasPermission,
  getAllPermissionsForRole,
  canAccessResource,
  grantTemporaryPermission,
  revokePermissionGrant,
  requiresMFA,
  getSessionTimeout,
  getMaxConcurrentSessions,
  canTransitionRole,
  requestEmergencyAccess,
  logSecurityEvent
};

export default RBACUtilities;