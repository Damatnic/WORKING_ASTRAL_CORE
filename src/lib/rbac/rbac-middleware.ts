import { NextRequest, NextResponse } from 'next/server';
import { rbacService } from './rbac-service';
import { Resource, Action } from './permissions';
import { getSessionFromRequest, SessionContext } from '@/lib/session/session-middleware';
import { createErrorResponse } from '@/types/api';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';

// RBAC middleware options
export interface RBACOptions {
  resource: Resource;
  action: Action;
  getResourceId?: (request: NextRequest) => string | undefined;
  getResourceOwnerId?: (request: NextRequest, resourceId?: string) => Promise<string | undefined>;
  skipOwnershipCheck?: boolean;
  customContext?: (request: NextRequest, session: SessionContext) => Record<string, any>;
}

/**
 * RBAC middleware for protecting API routes
 */
export function withRBAC(
  options: RBACOptions,
  handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Get session first
    const session = await getSessionFromRequest(request);
    
    if (!session) {
      await auditService.logEvent({
        category: AuditEventCategory.UNAUTHORIZED_ACCESS,
        action: 'RBAC_NO_SESSION',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.MEDIUM,
        description: 'RBAC check failed - no valid session',
        sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        metadata: {
          resource: options.resource,
          action: options.action,
          path: request.nextUrl.pathname,
        },
      });

      return NextResponse.json(
        createErrorResponse('Authentication required'),
        { status: 401 }
      );
    }

    try {
      // Get resource ID if provided
      const resourceId = options.getResourceId?.(request);
      
      // Get resource owner ID if needed
      let resourceOwnerId: string | undefined;
      if (!options.skipOwnershipCheck && resourceId) {
        resourceOwnerId = await options.getResourceOwnerId?.(request, resourceId);
      }

      // Build permission context
      const context = {
        userId: session.userId,
        userRole: session.userRole,
        resourceId,
        resourceOwnerId,
        ...(options.customContext?.(request, session) || {}),
      };

      // Check permission
      const permissionResult = await rbacService.checkPermission(
        context,
        options.resource,
        options.action
      );

      if (!permissionResult.allowed) {
        await auditService.logEvent({
          category: AuditEventCategory.UNAUTHORIZED_ACCESS,
          action: 'RBAC_PERMISSION_DENIED',
          outcome: AuditOutcome.FAILURE,
          riskLevel: RiskLevel.HIGH,
          description: permissionResult.reason || 'Permission denied',
          userId: session.userId,
          userRole: session.userRole,
          sourceIp: session.ipAddress,
          userAgent: session.userAgent,
          resourceType: options.resource,
          resourceId,
          metadata: {
            resource: options.resource,
            action: options.action,
            path: request.nextUrl.pathname,
            reason: permissionResult.reason,
          },
        });

        return NextResponse.json(
          createErrorResponse(
            permissionResult.reason || 'Insufficient permissions',
            'PERMISSION_DENIED',
            {
              
              current: permissionResult.userPermissions?.filter(p => 
                p.resource === options.resource
              ),
            }
          ),
          { status: 403 }
        );
      }

      // Permission granted, proceed with handler
      return handler(request, session);
    } catch (error) {
      console.error('RBAC middleware error:', error);
      
      await auditService.logEvent({
        category: (AuditEventCategory as any).SYSTEM_ERROR,
        action: 'RBAC_MIDDLEWARE_ERROR',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.HIGH,
        description: 'RBAC middleware encountered an error',
        userId: session.userId,
        userRole: session.userRole,
        sourceIp: session.ipAddress,
        userAgent: session.userAgent,
        errorDetails: {
          errorCode: 'RBAC_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          
          action: options.action,
        },
      });

      return NextResponse.json(
        createErrorResponse('Permission check failed'),
        { status: 500 }
      );
    }
  };
}

/**
 * Helper function to require specific permissions
 */
export function requirePermission(
  resource: Resource,
  action: Action
) {
  return (handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>) => {
    return withRBAC({ resource, action }, handler);
  };
}

/**
 * Helper function to require ownership of a resource
 */
export function requireOwnership(
  resource: Resource,
  action: Action,
  getResourceId: (request: NextRequest) => string | undefined,
  getResourceOwnerId: (request: NextRequest, resourceId?: string) => Promise<string | undefined>
) {
  return (handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>) => {
    return withRBAC({
      resource,
      action,
      getResourceId,
      getResourceOwnerId,
    }, handler);
  };
}

/**
 * Batch permission check for multiple resources
 */
export async function checkMultiplePermissions(
  session: SessionContext,
  permissions: Array<{ resource: Resource; action: Action }>
): Promise<boolean> {
  const context = {
    userId: session.userId,
    userRole: session.userRole,
  };

  const results = await rbacService.checkPermissions(context, permissions);
  
  // All permissions must be allowed
  for (const result of results.values()) {
    if (!result.allowed) {
      return false;
    }
  }

  return true;
}

/**
 * Get user's permissions for frontend
 */
export async function getUserPermissionsForFrontend(
  session: SessionContext
): Promise<{
  role: string;
  permissions: Array<{ resource: string; actions: string[] }>;
  resources: string[];
}> {
  const permissions = rbacService.getUserPermissions(session.userRole);
  const resources = rbacService.getUserResources(session.userRole);

  // Group permissions by resource
  const permissionMap = new Map<string, Set<string>>();
  
  permissions.forEach(perm => {
    if (!permissionMap.has(perm.resource)) {
      permissionMap.set(perm.resource, new Set());
    }
    permissionMap.get(perm.resource)!.add(perm.action);
  });

  // Convert to array format
  const permissionArray = Array.from(permissionMap.entries()).map(([resource, actions]) => ({
    resource,
    actions: Array.from(actions),
  }));

  return {
    role: session.userRole,
    permissions: permissionArray,
    resources: resources.map(r => r.toString()),
  };
}

/**
 * Middleware to add user permissions to response headers
 */
export function withPermissionHeaders(
  handler: (request: NextRequest, context: SessionContext) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: SessionContext): Promise<NextResponse> => {
    const response = await handler(request, context);
    
    // Add permission headers for frontend
    const permissions = await getUserPermissionsForFrontend(context);
    response.headers.set('X-User-Role', permissions.role);
    response.headers.set('X-User-Resources', permissions.resources.join(','));
    
    return response;
  };
}