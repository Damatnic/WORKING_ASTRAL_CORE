import { prisma } from '@/lib/prisma';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';
import {
  Resource,
  Action,
  Permission,
  PermissionCondition,
  hasPermission,
  getRolePermissions,
  getRoleResources,
  getRoleActions,
  SYSTEM_ROLES,
} from './permissions';
import { z } from 'zod';

// Permission check result
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
  userPermissions?: Permission[];
}

// Resource access context
export interface ResourceContext {
  userId: string;
  userRole: string;
  userEmail?: string;
  resourceId?: string;
  resourceOwnerId?: string;
  resourceType?: string;
  metadata?: Record<string, any>;
}

// Permission cache entry
interface CacheEntry {
  key: string;
  result: boolean;
  timestamp: number;
}

export class RBACService {
  private static instance: RBACService;
  private permissionCache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  /**
   * Check if a user has permission to perform an action on a resource
   */
  async checkPermission(
    context: ResourceContext,
    resource: Resource,
    action: Action,
    skipCache: boolean = false
  ): Promise<PermissionCheckResult> {
    const { userId, userRole, userEmail } = context;

    // Generate cache key
    const cacheKey = `${userId}:${userRole}:${resource}:${action}:${context.resourceOwnerId || ''}`;

    // Check cache if not skipped
    if (!skipCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached !== null) {
        return {
          allowed: cached,
          reason: cached ? 'Permission granted (cached)' : 'Permission denied (cached)',
        };
      }
    }

    try {
      // Super admin bypass - always allowed
      if (userRole === 'SUPER_ADMIN') {
        this.setCache(cacheKey, true);
        return {
          allowed: true,
          reason: 'Super admin has all permissions',
        };
      }

      // Check if user is active
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true, lockedUntil: true },
      });

      if (!user?.isActive) {
        await this.logPermissionDenied(context, resource, action, 'User account is inactive');
        return {
          allowed: false,
          reason: 'User account is inactive',
        };
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await this.logPermissionDenied(context, resource, action, 'User account is locked');
        return {
          allowed: false,
          reason: 'User account is locked',
        };
      }

      // Get resource owner if needed
      let resourceOwnerId = context.resourceOwnerId;
      if (!resourceOwnerId && context.resourceId) {
        resourceOwnerId = await this.getResourceOwner(resource, context.resourceId);
      }

      // Check permission with context
      const hasAccess = hasPermission(
        userRole,
        resource,
        action,
        {
          ...context,
          resourceOwnerId,
        }
      );

      // Cache the result
      this.setCache(cacheKey, hasAccess);

      // Log sensitive operations
      if (this.isSensitiveOperation(resource, action)) {
        await this.logPermissionCheck(context, resource, action, hasAccess);
      }

      if (!hasAccess) {
        const requiredPermissions = [{ resource, action }];
        const userPermissions = getRolePermissions(userRole);

        return {
          allowed: false,
          reason: `Role ${userRole} does not have ${action} permission for ${resource}`,
          requiredPermissions,
          userPermissions,
        };
      }

      return {
        allowed: true,
        reason: 'Permission granted',
      };
    } catch (error) {
      console.error('Permission check error:', error);
      
      // Log the error
      await auditService.logEvent({
        category: (AuditEventCategory as any).SYSTEM_ERROR,
        action: 'PERMISSION_CHECK_ERROR',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.HIGH,
        description: 'Error during permission check',
        userId,
        userEmail,
        userRole,
        metadata: {
          resource,
          action,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Fail closed - deny on error
      return {
        allowed: false,
        reason: 'Permission check failed due to system error',
      };
    }
  }

  /**
   * Check multiple permissions at once
   */
  async checkPermissions(
    context: ResourceContext,
    permissions: Array<{ resource: Resource; action: Action }>
  ): Promise<Map<string, PermissionCheckResult>> {
    const results = new Map<string, PermissionCheckResult>();

    for (const perm of permissions) {
      const key = `${perm.resource}:${perm.action}`;
      const result = await this.checkPermission(context, perm.resource, perm.action);
      results.set(key, result);
    }

    return results;
  }

  /**
   * Check if user can access a specific resource instance
   */
  async canAccessResource(
    context: ResourceContext,
    resource: Resource,
    resourceId: string
  ): Promise<boolean> {
    // Add resource ID to context
    const resourceContext = {
      ...context,
      resourceId,
    };

    // Check read permission
    const result = await this.checkPermission(resourceContext, resource, Action.READ);
    return result.allowed;
  }

  /**
   * Get all permissions for a user's role
   */
  getUserPermissions(userRole: string): Permission[] {
    return getRolePermissions(userRole);
  }

  /**
   * Get all resources accessible by a user's role
   */
  getUserResources(userRole: string): Resource[] {
    return getRoleResources(userRole);
  }

  /**
   * Get all actions a user can perform on a resource
   */
  getUserActions(userRole: string, resource: Resource): Action[] {
    return getRoleActions(userRole, resource);
  }

  /**
   * Grant temporary permission override (for delegated access)
   */
  async grantTemporaryPermission(
    params: {
      userId: string;
      grantedBy: string;
      resource: Resource;
      action: Action;
      expiresAt: Date;
      reason: string;
    }
  ): Promise<string> {
    const { userId, grantedBy, resource, action, expiresAt, reason } = params;

    // Create temporary permission record
    const tempPermission = await prisma.temporaryPermission.create({
      data: {
        userId,
        grantedBy,
        resource,
        action,
        expiresAt,
        reason,
        isActive: true,
      },
    });

    // Log the grant
    await auditService.logEvent({
      category: (AuditEventCategory as any).PERMISSION_CHANGE,
      action: 'TEMPORARY_PERMISSION_GRANTED',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: RiskLevel.MEDIUM,
      description: `Temporary permission granted: ${action} on ${resource}`,
      userId: grantedBy,
      metadata: {
        targetUserId: userId,
        resource,
        action,
        expiresAt,
        reason,
        permissionId: tempPermission.id,
      },
    });

    return tempPermission.id;
  }

  /**
   * Revoke temporary permission
   */
  async revokeTemporaryPermission(
    permissionId: string,
    revokedBy: string
  ): Promise<void> {
    const permission = await prisma.temporaryPermission.update({
      where: { id: permissionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedBy,
      },
    });

    // Clear cache for affected user
    this.clearUserCache(permission.userId);

    // Log the revocation
    await auditService.logEvent({
      category: (AuditEventCategory as any).PERMISSION_CHANGE,
      action: 'TEMPORARY_PERMISSION_REVOKED',
      outcome: AuditOutcome.SUCCESS,
      riskLevel: RiskLevel.MEDIUM,
      description: 'Temporary permission revoked',
      userId: revokedBy,
      metadata: {
        permissionId,
        targetUserId: permission.userId,
        resource: permission.resource,
        action: permission.action,
      },
    });
  }

  /**
   * Check if user has any temporary permissions
   */
  async getTemporaryPermissions(userId: string): Promise<Permission[]> {
    const tempPerms = await prisma.temporaryPermission.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return tempPerms.map(p => ({
      resource: p.resource as Resource,
      action: p.action as Action,
    }));
  }

  /**
   * Validate role assignment
   */
  async validateRoleAssignment(
    userId: string,
    newRole: string,
    assignedBy: string
  ): Promise<{ valid: boolean; reason?: string }> {
    // Check if role exists
    if (!SYSTEM_ROLES[newRole]) {
      return {
        valid: false,
        reason: `Role ${newRole} does not exist`,
      };
    }

    // Check if assigner has permission to assign roles
    const assigner = await prisma.user.findUnique({
      where: { id: assignedBy },
      select: { role: true },
    });

    if (!assigner) {
      return {
        valid: false,
        reason: 'Assigner not found',
      };
    }

    // Only admins can assign roles
    if (!['ADMIN', 'SUPER_ADMIN'].includes(assigner.role)) {
      return {
        valid: false,
        reason: 'Insufficient permissions to assign roles',
      };
    }

    // Check role hierarchy - can't assign higher role than own
    const assignerPriority = SYSTEM_ROLES[assigner.role]?.priority || 0;
    const newRolePriority = SYSTEM_ROLES[newRole]?.priority || 0;

    if (newRolePriority > assignerPriority) {
      return {
        valid: false,
        reason: 'Cannot assign a role higher than your own',
      };
    }

    // Check for clinical role requirements
    if (['THERAPIST', 'CRISIS_COUNSELOR'].includes(newRole)) {
      // Would check for certifications here
      // For now, just log that verification is needed
      await auditService.logEvent({
        category: (AuditEventCategory as any).PERMISSION_CHANGE,
        action: 'CLINICAL_ROLE_ASSIGNMENT',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.HIGH,
        description: `Clinical role ${newRole} assigned - verification required`,
        userId: assignedBy,
        metadata: {
          targetUserId: userId,
          newRole,
          requiresVerification: true,
        },
      });
    }

    return { valid: true };
  }

  /**
   * Get resource owner ID
   */
  private async getResourceOwner(
    resource: Resource,
    resourceId: string
  ): Promise<string | undefined> {
    try {
      switch (resource) {
        case Resource.JOURNAL_ENTRY:
          const journal = await prisma.journalEntry.findUnique({
            where: { id: resourceId },
            select: { userId: true },
          });
          return journal?.userId;

        case Resource.MOOD_ENTRY:
          const mood = await prisma.moodEntry.findUnique({
            where: { id: resourceId },
            select: { userId: true },
          });
          return mood?.userId;

        case Resource.COMMUNITY_POST:
          const post = await prisma.communityPost.findUnique({
            where: { id: resourceId },
            select: { authorId: true },
          });
          return post?.authorId;

        case Resource.FILE:
          const file = await prisma.file.findUnique({
            where: { id: resourceId },
            select: { userId: true },
          });
          return file?.userId;

        // Add more resource types as needed
        default:
          return undefined;
      }
    } catch (error) {
      console.error(`Error getting owner for ${resource}:${resourceId}`, error);
      return undefined;
    }
  }

  /**
   * Check if operation is sensitive and should be logged
   */
  private isSensitiveOperation(resource: Resource, action: Action): boolean {
    const sensitiveResources = [
      Resource.THERAPY_NOTE,
      Resource.CLIENT_RECORD,
      Resource.ASSESSMENT,
      Resource.TREATMENT_PLAN,
      Resource.AUDIT_LOG,
      Resource.SYSTEM_CONFIG,
    ];

    const sensitiveActions = [
      Action.DELETE,
      Action.EXPORT,
      Action.OVERRIDE,
      Action.CONFIGURE,
    ];

    return sensitiveResources.includes(resource) || sensitiveActions.includes(action);
  }

  /**
   * Log permission check for audit
   */
  private async logPermissionCheck(
    context: ResourceContext,
    resource: Resource,
    action: Action,
    allowed: boolean
  ): Promise<void> {
    await auditService.logEvent({
      category: allowed ? AuditEventCategory.PHI_ACCESS : AuditEventCategory.UNAUTHORIZED_ACCESS,
      action: 'PERMISSION_CHECK',
      outcome: allowed ? AuditOutcome.SUCCESS : AuditOutcome.FAILURE,
      riskLevel: allowed ? RiskLevel.LOW : RiskLevel.MEDIUM,
      description: `Permission check: ${action} on ${resource}`,
      userId: context.userId,
      userEmail: context.userEmail,
      userRole: context.userRole,
      resourceType: resource,
      resourceId: context.resourceId,
      metadata: {
        action,
        resource,
        allowed,
        resourceOwnerId: context.resourceOwnerId,
      },
    });
  }

  /**
   * Log permission denied event
   */
  private async logPermissionDenied(
    context: ResourceContext,
    resource: Resource,
    action: Action,
    reason: string
  ): Promise<void> {
    await auditService.logEvent({
      category: AuditEventCategory.UNAUTHORIZED_ACCESS,
      action: 'PERMISSION_DENIED',
      outcome: AuditOutcome.FAILURE,
      riskLevel: RiskLevel.MEDIUM,
      description: `Permission denied: ${reason}`,
      userId: context.userId,
      userEmail: context.userEmail,
      userRole: context.userRole,
      resourceType: resource,
      resourceId: context.resourceId,
      metadata: {
        action,
        resource,
        reason,
      },
    });
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): boolean | null {
    const entry = this.permissionCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.permissionCache.delete(key);
      return null;
    }

    return entry.result;
  }

  private setCache(key: string, result: boolean): void {
    this.permissionCache.set(key, {
      key,
      result,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.permissionCache.size > 1000) {
      const oldestKey = this.permissionCache.keys().next().value;
      if (oldestKey) {
        this.permissionCache.delete(oldestKey);
      }
    }
  }

  private clearUserCache(userId: string): void {
    for (const [key] of this.permissionCache) {
      if (key.startsWith(`${userId}:`)) {
        this.permissionCache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.permissionCache.clear();
  }
}

// Export singleton instance
export const rbacService = RBACService.getInstance();