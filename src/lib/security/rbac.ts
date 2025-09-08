/**
 * Role-Based Access Control (RBAC) System
 * Granular permission management for healthcare platform
 * Implements dynamic permission checking and resource-level access control
 */

import { prisma } from '@/lib/prisma';
import { auditService, AuditEventType } from './audit';
import { getServerSession } from 'next-auth/next';

// System roles
export enum SystemRole {
  PATIENT = 'PATIENT',
  THERAPIST = 'THERAPIST',
  CRISIS_COUNSELOR = 'CRISIS_COUNSELOR',
  CLINICAL_SUPERVISOR = 'CLINICAL_SUPERVISOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  HELPER = 'HELPER',
  PEER_SUPPORTER = 'PEER_SUPPORTER',
  CARE_COORDINATOR = 'CARE_COORDINATOR',
  MEDICAL_PROVIDER = 'MEDICAL_PROVIDER'
}

// Permission categories
export enum PermissionCategory {
  PATIENT_RECORDS = 'PATIENT_RECORDS',
  THERAPY_SESSIONS = 'THERAPY_SESSIONS',
  CRISIS_MANAGEMENT = 'CRISIS_MANAGEMENT',
  ASSESSMENTS = 'ASSESSMENTS',
  TREATMENT_PLANS = 'TREATMENT_PLANS',
  MEDICATIONS = 'MEDICATIONS',
  BILLING = 'BILLING',
  REPORTS = 'REPORTS',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  AUDIT_LOGS = 'AUDIT_LOGS',
  COMMUNICATIONS = 'COMMUNICATIONS',
  APPOINTMENTS = 'APPOINTMENTS',
  DOCUMENTS = 'DOCUMENTS'
}

// Permission actions
export enum PermissionAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXPORT = 'EXPORT',
  SHARE = 'SHARE',
  APPROVE = 'APPROVE',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
  EXECUTE = 'EXECUTE'
}

// Resource types
export enum ResourceType {
  PATIENT = 'PATIENT',
  THERAPY_SESSION = 'THERAPY_SESSION',
  CRISIS_REPORT = 'CRISIS_REPORT',
  ASSESSMENT = 'ASSESSMENT',
  TREATMENT_PLAN = 'TREATMENT_PLAN',
  MEDICATION = 'MEDICATION',
  DOCUMENT = 'DOCUMENT',
  APPOINTMENT = 'APPOINTMENT',
  MESSAGE = 'MESSAGE',
  JOURNAL_ENTRY = 'JOURNAL_ENTRY',
  MOOD_TRACKING = 'MOOD_TRACKING',
  EMERGENCY_CONTACT = 'EMERGENCY_CONTACT'
}

interface Permission {
  id: string;
  name: string;
  category: PermissionCategory;
  action: PermissionAction;
  resource?: ResourceType;
  description: string;
  constraints?: any;
}

interface RolePermission {
  role: SystemRole;
  permissions: Permission[];
  inherits?: SystemRole[];
}

interface AccessContext {
  userId: string;
  userRole: SystemRole;
  resourceType: ResourceType;
  resourceId?: string;
  action: PermissionAction;
  metadata?: Record<string, any>;
}

interface AccessDecision {
  granted: boolean;
  reason?: string;
  conditions?: Record<string, any>;
  expiresAt?: Date;
}

/**
 * Role-Based Access Control Service
 * Manages permissions, roles, and access control decisions
 */
export class RBACService {
  private static instance: RBACService;
  private roleHierarchy: Map<SystemRole, SystemRole[]> = new Map();
  private permissionCache: Map<string, Permission[]> = new Map();
  private readonly CACHE_TTL = 300000; // 5 minutes
  private cacheTimestamps: Map<string, number> = new Map();

  private constructor() {
    this.initializeRoleHierarchy();
    this.loadDefaultPermissions();
  }

  static getInstance(): RBACService {
    if (!RBACService.instance) {
      RBACService.instance = new RBACService();
    }
    return RBACService.instance;
  }

  /**
   * Initialize role hierarchy for inheritance
   */
  private initializeRoleHierarchy(): void {
    // Define role inheritance
    this.roleHierarchy.set(SystemRole.SUPER_ADMIN, [SystemRole.ADMIN]);
    this.roleHierarchy.set(SystemRole.ADMIN, [SystemRole.CLINICAL_SUPERVISOR]);
    this.roleHierarchy.set(SystemRole.CLINICAL_SUPERVISOR, [SystemRole.THERAPIST]);
    this.roleHierarchy.set(SystemRole.THERAPIST, [SystemRole.CARE_COORDINATOR]);
    this.roleHierarchy.set(SystemRole.CRISIS_COUNSELOR, [SystemRole.HELPER]);
    this.roleHierarchy.set(SystemRole.MEDICAL_PROVIDER, [SystemRole.THERAPIST]);
  }

  /**
   * Load default permissions for roles
   */
  private async loadDefaultPermissions(): Promise<void> {
    // This would typically load from database
    // For now, we'll define default permissions programmatically
    
    const defaultPermissions: Record<SystemRole, Permission[]> = {
      [SystemRole.PATIENT]: [
        {
          id: 'read_own_records',
          name: 'Read Own Records',
          category: PermissionCategory.PATIENT_RECORDS,
          action: PermissionAction.READ,
          resource: ResourceType.PATIENT,
          description: 'Can read own medical records',
          constraints: { ownOnly: true }
        },
        {
          id: 'create_journal',
          name: 'Create Journal Entries',
          category: PermissionCategory.PATIENT_RECORDS,
          action: PermissionAction.CREATE,
          resource: ResourceType.JOURNAL_ENTRY,
          description: 'Can create journal entries',
          constraints: { ownOnly: true }
        },
        {
          id: 'read_appointments',
          name: 'Read Appointments',
          category: PermissionCategory.APPOINTMENTS,
          action: PermissionAction.READ,
          resource: ResourceType.APPOINTMENT,
          description: 'Can view own appointments',
          constraints: { ownOnly: true }
        }
      ],
      
      [SystemRole.THERAPIST]: [
        {
          id: 'read_patient_records',
          name: 'Read Patient Records',
          category: PermissionCategory.PATIENT_RECORDS,
          action: PermissionAction.READ,
          resource: ResourceType.PATIENT,
          description: 'Can read assigned patient records',
          constraints: { assignedOnly: true }
        },
        {
          id: 'create_therapy_session',
          name: 'Create Therapy Sessions',
          category: PermissionCategory.THERAPY_SESSIONS,
          action: PermissionAction.CREATE,
          resource: ResourceType.THERAPY_SESSION,
          description: 'Can create therapy session notes'
        },
        {
          id: 'update_treatment_plan',
          name: 'Update Treatment Plans',
          category: PermissionCategory.TREATMENT_PLANS,
          action: PermissionAction.UPDATE,
          resource: ResourceType.TREATMENT_PLAN,
          description: 'Can update patient treatment plans',
          constraints: { assignedOnly: true }
        },
        {
          id: 'create_assessment',
          name: 'Create Assessments',
          category: PermissionCategory.ASSESSMENTS,
          action: PermissionAction.CREATE,
          resource: ResourceType.ASSESSMENT,
          description: 'Can create patient assessments'
        }
      ],
      
      [SystemRole.CRISIS_COUNSELOR]: [
        {
          id: 'create_crisis_report',
          name: 'Create Crisis Reports',
          category: PermissionCategory.CRISIS_MANAGEMENT,
          action: PermissionAction.CREATE,
          resource: ResourceType.CRISIS_REPORT,
          description: 'Can create crisis intervention reports'
        },
        {
          id: 'read_crisis_history',
          name: 'Read Crisis History',
          category: PermissionCategory.CRISIS_MANAGEMENT,
          action: PermissionAction.READ,
          resource: ResourceType.CRISIS_REPORT,
          description: 'Can read patient crisis history'
        },
        {
          id: 'update_emergency_contacts',
          name: 'Update Emergency Contacts',
          category: PermissionCategory.PATIENT_RECORDS,
          action: PermissionAction.UPDATE,
          resource: ResourceType.EMERGENCY_CONTACT,
          description: 'Can update emergency contact information'
        }
      ],
      
      [SystemRole.CLINICAL_SUPERVISOR]: [
        {
          id: 'approve_treatment_plans',
          name: 'Approve Treatment Plans',
          category: PermissionCategory.TREATMENT_PLANS,
          action: PermissionAction.APPROVE,
          resource: ResourceType.TREATMENT_PLAN,
          description: 'Can approve treatment plans'
        },
        {
          id: 'read_all_sessions',
          name: 'Read All Therapy Sessions',
          category: PermissionCategory.THERAPY_SESSIONS,
          action: PermissionAction.READ,
          resource: ResourceType.THERAPY_SESSION,
          description: 'Can read all therapy session notes'
        },
        {
          id: 'export_reports',
          name: 'Export Clinical Reports',
          category: PermissionCategory.REPORTS,
          action: PermissionAction.EXPORT,
          description: 'Can export clinical reports'
        }
      ],
      
      [SystemRole.ADMIN]: [
        {
          id: 'manage_users',
          name: 'Manage Users',
          category: PermissionCategory.USER_MANAGEMENT,
          action: PermissionAction.CREATE,
          description: 'Can create and manage user accounts'
        },
        {
          id: 'view_audit_logs',
          name: 'View Audit Logs',
          category: PermissionCategory.AUDIT_LOGS,
          action: PermissionAction.READ,
          description: 'Can view system audit logs'
        },
        {
          id: 'manage_permissions',
          name: 'Manage Permissions',
          category: PermissionCategory.SYSTEM_ADMIN,
          action: PermissionAction.UPDATE,
          description: 'Can manage role permissions'
        }
      ],
      
      [SystemRole.SUPER_ADMIN]: [
        {
          id: 'full_access',
          name: 'Full System Access',
          category: PermissionCategory.SYSTEM_ADMIN,
          action: PermissionAction.EXECUTE,
          description: 'Full access to all system functions'
        }
      ],
      
      [SystemRole.HELPER]: [
        {
          id: 'provide_support',
          name: 'Provide Peer Support',
          category: PermissionCategory.COMMUNICATIONS,
          action: PermissionAction.CREATE,
          resource: ResourceType.MESSAGE,
          description: 'Can provide peer support messages'
        }
      ],
      
      [SystemRole.PEER_SUPPORTER]: [
        {
          id: 'moderate_groups',
          name: 'Moderate Support Groups',
          category: PermissionCategory.COMMUNICATIONS,
          action: PermissionAction.UPDATE,
          description: 'Can moderate support group discussions'
        }
      ],
      
      [SystemRole.CARE_COORDINATOR]: [
        {
          id: 'manage_appointments',
          name: 'Manage Appointments',
          category: PermissionCategory.APPOINTMENTS,
          action: PermissionAction.UPDATE,
          resource: ResourceType.APPOINTMENT,
          description: 'Can manage patient appointments'
        },
        {
          id: 'coordinate_care',
          name: 'Coordinate Care',
          category: PermissionCategory.PATIENT_RECORDS,
          action: PermissionAction.UPDATE,
          description: 'Can coordinate patient care activities'
        }
      ],
      
      [SystemRole.MEDICAL_PROVIDER]: [
        {
          id: 'prescribe_medications',
          name: 'Prescribe Medications',
          category: PermissionCategory.MEDICATIONS,
          action: PermissionAction.CREATE,
          resource: ResourceType.MEDICATION,
          description: 'Can prescribe medications'
        },
        {
          id: 'update_medications',
          name: 'Update Medications',
          category: PermissionCategory.MEDICATIONS,
          action: PermissionAction.UPDATE,
          resource: ResourceType.MEDICATION,
          description: 'Can update medication records'
        }
      ]
    };

    // Cache default permissions
    for (const [role, permissions] of Object.entries(defaultPermissions)) {
      this.permissionCache.set(role, permissions);
      this.cacheTimestamps.set(role, Date.now());
    }
  }

  /**
   * Check if user has permission for action
   */
  async checkPermission(context: AccessContext): Promise<AccessDecision> {
    try {
      // Get user's effective permissions
      const permissions = await this.getUserPermissions(context.userId, context.userRole);

      // Check for super admin
      if (context.userRole === SystemRole.SUPER_ADMIN) {
        await this.logAccessDecision(context, true, 'Super admin access');
        return { granted: true, reason: 'Super admin access' };
      }

      // Find matching permission
      const matchingPermission = permissions.find(p => {
        if (p.category !== this.getResourceCategory(context.resourceType)) {
          return false;
        }
        
        if (p.action !== context.action) {
          return false;
        }

        if (p.resource && p.resource !== context.resourceType) {
          return false;
        }

        return true;
      });

      if (!matchingPermission) {
        await this.logAccessDecision(context, false, 'No matching permission');
        return { granted: false, reason: 'Permission not found for action' };
      }

      // Check constraints
      if (matchingPermission.constraints) {
        const constraintCheck = await this.checkConstraints(
          context,
          matchingPermission.constraints
        );
        
        if (!constraintCheck.granted) {
          await this.logAccessDecision(context, false, constraintCheck.reason);
          return constraintCheck;
        }
      }

      // Check resource-level permissions
      if (context.resourceId) {
        const resourceCheck = await this.checkResourceAccess(context);
        if (!resourceCheck.granted) {
          await this.logAccessDecision(context, false, resourceCheck.reason);
          return resourceCheck;
        }
      }

      await this.logAccessDecision(context, true, 'Permission granted');
      return { granted: true, reason: 'Permission granted' };

    } catch (error) {
      console.error('Permission check error:', error);
      await this.logAccessDecision(context, false, 'Permission check error');
      return { granted: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Get all permissions for a user
   */
  async getUserPermissions(userId: string, role: SystemRole): Promise<Permission[]> {
    // Check cache
    const cacheKey = `${userId}-${role}`;
    const cached = this.permissionCache.get(cacheKey);
    const cacheTime = this.cacheTimestamps.get(cacheKey);

    if (cached && cacheTime && (Date.now() - cacheTime < this.CACHE_TTL)) {
      return cached;
    }

    // Get role permissions
    const permissions: Permission[] = [];

    // Get direct role permissions
    const rolePermissions = this.permissionCache.get(role) || [];
    permissions.push(...rolePermissions);

    // Get inherited permissions
    const inheritedRoles = this.roleHierarchy.get(role) || [];
    for (const inheritedRole of inheritedRoles) {
      const inheritedPermissions = await this.getUserPermissions(userId, inheritedRole);
      permissions.push(...inheritedPermissions);
    }

    // Get user-specific permissions from database
    const userPermissions = await (prisma as any).userPermission.findMany({
      where: { userId },
      include: { permission: true }
    });

    const additionalPermissions = userPermissions.map(up => ({
      id: up.permission.id,
      name: up.permission.name,
      category: up.permission.category as PermissionCategory,
      action: up.permission.action as PermissionAction,
      resource: up.permission.resource as ResourceType | undefined,
      description: up.permission.description,
      constraints: up.permission.constraints
    }));

    permissions.push(...additionalPermissions);

    // Remove duplicates
    const uniquePermissions = Array.from(
      new Map(permissions.map(p => [p.id, p])).values()
    );

    // Cache results
    this.permissionCache.set(cacheKey, uniquePermissions);
    this.cacheTimestamps.set(cacheKey, Date.now());

    return uniquePermissions;
  }

  /**
   * Grant permission to user
   */
  async grantPermission(
    userId: string,
    permissionId: string,
    grantedBy: string,
    expiresAt?: Date
  ): Promise<void> {
    await (prisma as any).userPermission.create({
      data: {
        userId,
        permissionId,
        grantedBy,
        grantedAt: new Date(),
        expiresAt
      }
    });

    // Clear cache for user
    const userRole = await this.getUserRole(userId);
    const cacheKey = `${userId}-${userRole}`;
    this.permissionCache.delete(cacheKey);

    // Log permission grant
    await auditService.log(
      AuditEventType.PERMISSION_GRANT,
      'Permission granted to user',
      { userId: grantedBy },
      { targetUserId: userId, permissionId, expiresAt }
    );
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(
    userId: string,
    permissionId: string,
    revokedBy: string
  ): Promise<void> {
    await (prisma as any).userPermission.deleteMany({
      where: {
        userId,
        permissionId
      }
    });

    // Clear cache for user
    const userRole = await this.getUserRole(userId);
    const cacheKey = `${userId}-${userRole}`;
    this.permissionCache.delete(cacheKey);

    // Log permission revocation
    await auditService.log(
      AuditEventType.PERMISSION_REVOKE,
      'Permission revoked from user',
      { userId: revokedBy },
      { targetUserId: userId, permissionId }
    );
  }

  /**
   * Assign role to user
   */
  async assignRole(
    userId: string,
    role: SystemRole,
    assignedBy: string
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    // Clear cache for user
    const cacheKey = `${userId}-${role}`;
    this.permissionCache.delete(cacheKey);

    // Log role assignment
    await auditService.log(
      AuditEventType.ROLE_ASSIGN,
      'Role assigned to user',
      { userId: assignedBy },
      { targetUserId: userId, role }
    );
  }

  /**
   * Check permission constraints
   */
  private async checkConstraints(
    context: AccessContext,
    constraints: any
  ): Promise<AccessDecision> {
    // Check "own only" constraint
    if (constraints.ownOnly) {
      if (context.resourceType === ResourceType.PATIENT) {
        if (context.resourceId !== context.userId) {
          return {
            granted: false,
            reason: 'Can only access own records'
          };
        }
      }
    }

    // Check "assigned only" constraint
    if (constraints.assignedOnly) {
      const isAssigned = await this.checkAssignment(
        context.userId,
        context.resourceId!,
        context.resourceType
      );
      
      if (!isAssigned) {
        return {
          granted: false,
          reason: 'Not assigned to this resource'
        };
      }
    }

    // Check time-based constraints
    if (constraints.timeWindow) {
      const now = new Date();
      const start = new Date(constraints.timeWindow.start);
      const end = new Date(constraints.timeWindow.end);
      
      if (now < start || now > end) {
        return {
          granted: false,
          reason: 'Outside allowed time window'
        };
      }
    }

    // Check location-based constraints
    if (constraints.ipRestriction) {
      // This would check IP address restrictions
      // Implementation depends on infrastructure
    }

    return { granted: true };
  }

  /**
   * Check resource-level access
   */
  private async checkResourceAccess(context: AccessContext): Promise<AccessDecision> {
    // Check resource-specific access rules
    switch (context.resourceType) {
      case ResourceType.THERAPY_SESSION:
        return await this.checkTherapySessionAccess(context);
      
      case ResourceType.CRISIS_REPORT:
        return await this.checkCrisisReportAccess(context);
      
      case ResourceType.TREATMENT_PLAN:
        return await this.checkTreatmentPlanAccess(context);
      
      case ResourceType.MEDICATION:
        return await this.checkMedicationAccess(context);
      
      default:
        return { granted: true };
    }
  }

  /**
   * Check therapy session access
   */
  private async checkTherapySessionAccess(context: AccessContext): Promise<AccessDecision> {
    const session = await prisma.therapySession.findUnique({
      where: { id: context.resourceId }
    });

    if (!session) {
      return { granted: false, reason: 'Session not found' };
    }

    // Therapist can access their own sessions
    if (session.therapistId === context.userId) {
      return { granted: true };
    }

    // Patient can read their own sessions
    if (session.patientId === context.userId && context.action === PermissionAction.READ) {
      return { granted: true };
    }

    // Supervisors can access all sessions
    if (context.userRole === SystemRole.CLINICAL_SUPERVISOR) {
      return { granted: true };
    }

    return { granted: false, reason: 'Not authorized for this session' };
  }

  /**
   * Check crisis report access
   */
  private async checkCrisisReportAccess(context: AccessContext): Promise<AccessDecision> {
    const report = await prisma.crisisReport.findUnique({
      where: { id: context.resourceId }
    });

    if (!report) {
      return { granted: false, reason: 'Report not found' };
    }

    // Crisis counselor who created can access
    if ((report as any).counselorId === context.userId) {
      return { granted: true };
    }

    // Patient can read their own reports
    if ((report as any).patientId === context.userId && context.action === PermissionAction.READ) {
      return { granted: true };
    }

    // Any crisis counselor can read during active crisis
    if (context.userRole === SystemRole.CRISIS_COUNSELOR && (report as any).status === 'ACTIVE') {
      return { granted: true };
    }

    return { granted: false, reason: 'Not authorized for this report' };
  }

  /**
   * Check treatment plan access
   */
  private async checkTreatmentPlanAccess(context: AccessContext): Promise<AccessDecision> {
    const plan = await (prisma as any).treatmentPlan.findUnique({
      where: { id: context.resourceId }
    });

    if (!plan) {
      return { granted: false, reason: 'Treatment plan not found' };
    }

    // Check if user is part of care team
    const careTeam = await (prisma as any).careTeamMember.findFirst({
      where: {
        patientId: plan.patientId,
        userId: context.userId,
        active: true
      }
    });

    if (careTeam) {
      return { granted: true };
    }

    // Patient can read their own plan
    if (plan.patientId === context.userId && context.action === PermissionAction.READ) {
      return { granted: true };
    }

    return { granted: false, reason: 'Not part of care team' };
  }

  /**
   * Check medication access
   */
  private async checkMedicationAccess(context: AccessContext): Promise<AccessDecision> {
    // Only medical providers can prescribe
    if (context.action === PermissionAction.CREATE) {
      if (context.userRole !== SystemRole.MEDICAL_PROVIDER) {
        return { granted: false, reason: 'Only medical providers can prescribe medications' };
      }
    }

    return { granted: true };
  }

  /**
   * Check if user is assigned to resource
   */
  private async checkAssignment(
    userId: string,
    resourceId: string,
    resourceType: ResourceType
  ): Promise<boolean> {
    switch (resourceType) {
      case ResourceType.PATIENT:
        const assignment = await (prisma as any).patientAssignment.findFirst({
          where: {
            patientId: resourceId,
            providerId: userId,
            active: true
          }
        });
        return !!assignment;

      case ResourceType.TREATMENT_PLAN:
        const careTeam = await (prisma as any).careTeamMember.findFirst({
          where: {
            userId,
            active: true
          }
        });
        return !!careTeam;

      default:
        return true;
    }
  }

  /**
   * Get resource category
   */
  private getResourceCategory(resourceType: ResourceType): PermissionCategory {
    const categoryMap: Record<ResourceType, PermissionCategory> = {
      [ResourceType.PATIENT]: PermissionCategory.PATIENT_RECORDS,
      [ResourceType.THERAPY_SESSION]: PermissionCategory.THERAPY_SESSIONS,
      [ResourceType.CRISIS_REPORT]: PermissionCategory.CRISIS_MANAGEMENT,
      [ResourceType.ASSESSMENT]: PermissionCategory.ASSESSMENTS,
      [ResourceType.TREATMENT_PLAN]: PermissionCategory.TREATMENT_PLANS,
      [ResourceType.MEDICATION]: PermissionCategory.MEDICATIONS,
      [ResourceType.DOCUMENT]: PermissionCategory.DOCUMENTS,
      [ResourceType.APPOINTMENT]: PermissionCategory.APPOINTMENTS,
      [ResourceType.MESSAGE]: PermissionCategory.COMMUNICATIONS,
      [ResourceType.JOURNAL_ENTRY]: PermissionCategory.PATIENT_RECORDS,
      [ResourceType.MOOD_TRACKING]: PermissionCategory.PATIENT_RECORDS,
      [ResourceType.EMERGENCY_CONTACT]: PermissionCategory.PATIENT_RECORDS
    };

    return categoryMap[resourceType] || PermissionCategory.PATIENT_RECORDS;
  }

  /**
   * Get user role
   */
  private async getUserRole(userId: string): Promise<SystemRole> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    return (user?.role as SystemRole) || SystemRole.PATIENT;
  }

  /**
   * Log access decision
   */
  private async logAccessDecision(
    context: AccessContext,
    granted: boolean,
    reason?: string
  ): Promise<void> {
    const eventType = granted
      ? AuditEventType.PHI_VIEW
      : AuditEventType.UNAUTHORIZED_ACCESS;

    await auditService.log(
      eventType,
      `Access ${granted ? 'granted' : 'denied'} for ${context.action} on ${context.resourceType}`,
      { userId: context.userId },
      {
        resourceType: context.resourceType,
        resourceId: context.resourceId,
        action: context.action,
        reason,
        metadata: context.metadata
      },
      granted
    );
  }

  /**
   * Get role hierarchy
   */
  getRoleHierarchy(role: SystemRole): SystemRole[] {
    const hierarchy: SystemRole[] = [role];
    const inherited = this.roleHierarchy.get(role) || [];
    
    for (const inheritedRole of inherited) {
      hierarchy.push(...this.getRoleHierarchy(inheritedRole));
    }

    return [...new Set(hierarchy)];
  }

  /**
   * Clear permission cache
   */
  clearCache(userId?: string): void {
    if (userId) {
      // Clear specific user cache
      for (const key of this.permissionCache.keys()) {
        if (key.startsWith(userId)) {
          this.permissionCache.delete(key);
          this.cacheTimestamps.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.permissionCache.clear();
      this.cacheTimestamps.clear();
      this.loadDefaultPermissions();
    }
  }
}

// Export singleton instance
export const rbacService = RBACService.getInstance();

// Export convenience functions
export const checkPermission = (context: AccessContext) =>
  rbacService.checkPermission(context);

export const getUserPermissions = (userId: string, role: SystemRole) =>
  rbacService.getUserPermissions(userId, role);

export const grantPermission = (
  userId: string,
  permissionId: string,
  grantedBy: string,
  expiresAt?: Date
) => rbacService.grantPermission(userId, permissionId, grantedBy, expiresAt);

export const assignRole = (userId: string, role: SystemRole, assignedBy: string) =>
  rbacService.assignRole(userId, role, assignedBy);