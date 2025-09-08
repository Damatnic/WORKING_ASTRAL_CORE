/**
 * Comprehensive permissions system for role-based access control
 * Implements fine-grained permissions for all platform features
 */

// Resource types in the system
export enum Resource {
  // User Management
  USER = 'user',
  USER_PROFILE = 'user_profile',
  USER_SESSION = 'user_session',
  USER_DATA = 'user_data',
  
  // Clinical Resources
  THERAPY_SESSION = 'therapy_session',
  THERAPY_NOTE = 'therapy_note',
  CLIENT_RECORD = 'client_record',
  ASSESSMENT = 'assessment',
  TREATMENT_PLAN = 'treatment_plan',
  
  // Crisis Management
  CRISIS_ALERT = 'crisis_alert',
  CRISIS_REPORT = 'crisis_report',
  SAFETY_PLAN = 'safety_plan',
  EMERGENCY_CONTACT = 'emergency_contact',
  
  // Community Features
  COMMUNITY_POST = 'community_post',
  COMMUNITY_COMMENT = 'community_comment',
  COMMUNITY_GROUP = 'community_group',
  COMMUNITY_MODERATION = 'community_moderation',
  
  // Support Features
  SUPPORT_SESSION = 'support_session',
  PEER_SUPPORT = 'peer_support',
  HELPER_PROFILE = 'helper_profile',
  
  // Wellness Features
  MOOD_ENTRY = 'mood_entry',
  JOURNAL_ENTRY = 'journal_entry',
  WELLNESS_GOAL = 'wellness_goal',
  WELLNESS_CHALLENGE = 'wellness_challenge',
  
  // Communication
  MESSAGE = 'message',
  NOTIFICATION = 'notification',
  ANNOUNCEMENT = 'announcement',
  
  // Administrative
  ADMIN_DASHBOARD = 'admin_dashboard',
  ANALYTICS = 'analytics',
  AUDIT_LOG = 'audit_log',
  SYSTEM_CONFIG = 'system_config',
  COMPLIANCE_REPORT = 'compliance_report',
  
  // File Management
  FILE = 'file',
  FILE_UPLOAD = 'file_upload',
  FILE_EXPORT = 'file_export',
}

// Action types that can be performed on resources
export enum Action {
  // Basic CRUD
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  
  // Extended Actions
  LIST = 'list',
  SEARCH = 'search',
  EXPORT = 'export',
  IMPORT = 'import',
  
  // Moderation
  APPROVE = 'approve',
  REJECT = 'reject',
  FLAG = 'flag',
  MODERATE = 'moderate',
  
  // Management
  ASSIGN = 'assign',
  UNASSIGN = 'unassign',
  TRANSFER = 'transfer',
  ARCHIVE = 'archive',
  RESTORE = 'restore',
  
  // Special Actions
  EXECUTE = 'execute',
  OVERRIDE = 'override',
  AUDIT = 'audit',
  CONFIGURE = 'configure',
}

// Permission definition
export interface Permission {
  resource: Resource;
  action: Action;
  conditions?: PermissionCondition[];
}

// Condition for conditional permissions
export interface PermissionCondition {
  type: 'ownership' | 'department' | 'timeRange' | 'status' | 'custom';
  field?: string;
  operator?: 'equals' | 'notEquals' | 'in' | 'notIn' | 'greaterThan' | 'lessThan';
  value?: any;
  evaluator?: (context: any) => boolean;
}

// Role definition with permissions
export interface Role {
  name: string;
  description: string;
  permissions: Permission[];
  inherits?: string[]; // Roles that this role inherits from
  priority: number; // Higher number = higher priority for conflict resolution
}

// Define all system roles and their permissions
export const SYSTEM_ROLES: Record<string, Role> = {
  // Super Admin - Full system access
  SUPER_ADMIN: {
    name: 'SUPER_ADMIN',
    description: 'Full system access with all permissions',
    priority: 100,
    permissions: [
      // Grant all permissions on all resources
      ...Object.values(Resource).flatMap(resource =>
        Object.values(Action).map(action => ({
          resource: resource as Resource,
          action: action as Action,
        }))
      ),
    ],
  },

  // Admin - Administrative access
  ADMIN: {
    name: 'ADMIN',
    description: 'Administrative access with most permissions',
    priority: 90,
    inherits: ['COMPLIANCE_OFFICER'],
    permissions: [
      // User management
      { resource: Resource.USER, action: Action.CREATE },
      { resource: Resource.USER, action: Action.READ },
      { resource: Resource.USER, action: Action.UPDATE },
      { resource: Resource.USER, action: Action.DELETE },
      { resource: Resource.USER, action: Action.LIST },
      { resource: Resource.USER, action: Action.SEARCH },
      { resource: Resource.USER_SESSION, action: Action.READ },
      { resource: Resource.USER_SESSION, action: Action.DELETE },
      
      // Admin dashboard and analytics
      { resource: Resource.ADMIN_DASHBOARD, action: Action.READ },
      { resource: Resource.ANALYTICS, action: Action.READ },
      { resource: Resource.ANALYTICS, action: Action.EXPORT },
      
      // Audit and compliance
      { resource: Resource.AUDIT_LOG, action: Action.READ },
      { resource: Resource.AUDIT_LOG, action: Action.EXPORT },
      { resource: Resource.COMPLIANCE_REPORT, action: Action.READ },
      { resource: Resource.COMPLIANCE_REPORT, action: Action.CREATE },
      
      // System configuration
      { resource: Resource.SYSTEM_CONFIG, action: Action.READ },
      { resource: Resource.SYSTEM_CONFIG, action: Action.UPDATE },
      
      // Community moderation
      { resource: Resource.COMMUNITY_MODERATION, action: Action.EXECUTE },
      { resource: Resource.COMMUNITY_POST, action: Action.MODERATE },
      { resource: Resource.COMMUNITY_COMMENT, action: Action.MODERATE },
      
      // Announcements
      { resource: Resource.ANNOUNCEMENT, action: Action.CREATE },
      { resource: Resource.ANNOUNCEMENT, action: Action.UPDATE },
      { resource: Resource.ANNOUNCEMENT, action: Action.DELETE },
    ],
  },

  // Compliance Officer - HIPAA compliance and audit
  COMPLIANCE_OFFICER: {
    name: 'COMPLIANCE_OFFICER',
    description: 'HIPAA compliance and audit management',
    priority: 85,
    permissions: [
      // Audit logs - full access
      { resource: Resource.AUDIT_LOG, action: Action.READ },
      { resource: Resource.AUDIT_LOG, action: Action.EXPORT },
      { resource: Resource.AUDIT_LOG, action: Action.AUDIT },
      
      // Compliance reports
      { resource: Resource.COMPLIANCE_REPORT, action: Action.CREATE },
      { resource: Resource.COMPLIANCE_REPORT, action: Action.READ },
      { resource: Resource.COMPLIANCE_REPORT, action: Action.UPDATE },
      { resource: Resource.COMPLIANCE_REPORT, action: Action.EXPORT },
      
      // Limited user access for investigations
      { resource: Resource.USER, action: Action.READ },
      { resource: Resource.USER, action: Action.LIST },
      { resource: Resource.USER_SESSION, action: Action.READ },
      
      // Analytics for compliance monitoring
      { resource: Resource.ANALYTICS, action: Action.READ },
      { resource: Resource.ANALYTICS, action: Action.EXPORT },
      
      // System configuration review
      { resource: Resource.SYSTEM_CONFIG, action: Action.READ },
    ],
  },

  // Therapist - Clinical access
  THERAPIST: {
    name: 'THERAPIST',
    description: 'Licensed therapist with clinical access',
    priority: 70,
    permissions: [
      // Therapy sessions - full control over own sessions
      { resource: Resource.THERAPY_SESSION, action: Action.CREATE },
      { resource: Resource.THERAPY_SESSION, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.THERAPY_SESSION, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.THERAPY_SESSION, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.THERAPY_SESSION, action: Action.LIST, conditions: [{ type: 'ownership' }] },
      
      // Therapy notes - full control
      { resource: Resource.THERAPY_NOTE, action: Action.CREATE },
      { resource: Resource.THERAPY_NOTE, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.THERAPY_NOTE, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.THERAPY_NOTE, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      
      // Client records - manage own clients
      { resource: Resource.CLIENT_RECORD, action: Action.CREATE },
      { resource: Resource.CLIENT_RECORD, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.CLIENT_RECORD, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.CLIENT_RECORD, action: Action.ARCHIVE, conditions: [{ type: 'ownership' }] },
      
      // Assessments
      { resource: Resource.ASSESSMENT, action: Action.CREATE },
      { resource: Resource.ASSESSMENT, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.ASSESSMENT, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      
      // Treatment plans
      { resource: Resource.TREATMENT_PLAN, action: Action.CREATE },
      { resource: Resource.TREATMENT_PLAN, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.TREATMENT_PLAN, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      
      // Crisis management for clients
      { resource: Resource.CRISIS_REPORT, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.SAFETY_PLAN, action: Action.CREATE },
      { resource: Resource.SAFETY_PLAN, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.SAFETY_PLAN, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      
      // Messages with clients
      { resource: Resource.MESSAGE, action: Action.CREATE },
      { resource: Resource.MESSAGE, action: Action.READ, conditions: [{ type: 'ownership' }] },
      
      // File management for clinical documents
      { resource: Resource.FILE, action: Action.CREATE },
      { resource: Resource.FILE, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.FILE, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
    ],
  },

  // Crisis Counselor - Emergency support
  CRISIS_COUNSELOR: {
    name: 'CRISIS_COUNSELOR',
    description: 'Crisis intervention specialist',
    priority: 65,
    permissions: [
      // Crisis alerts - full access
      { resource: Resource.CRISIS_ALERT, action: Action.READ },
      { resource: Resource.CRISIS_ALERT, action: Action.UPDATE },
      { resource: Resource.CRISIS_ALERT, action: Action.ASSIGN },
      { resource: Resource.CRISIS_ALERT, action: Action.EXECUTE },
      
      // Crisis reports
      { resource: Resource.CRISIS_REPORT, action: Action.CREATE },
      { resource: Resource.CRISIS_REPORT, action: Action.READ },
      { resource: Resource.CRISIS_REPORT, action: Action.UPDATE },
      
      // Safety plans - read and create
      { resource: Resource.SAFETY_PLAN, action: Action.CREATE },
      { resource: Resource.SAFETY_PLAN, action: Action.READ },
      { resource: Resource.SAFETY_PLAN, action: Action.UPDATE },
      
      // Emergency contacts
      { resource: Resource.EMERGENCY_CONTACT, action: Action.READ },
      { resource: Resource.EMERGENCY_CONTACT, action: Action.UPDATE },
      
      // Support sessions during crisis
      { resource: Resource.SUPPORT_SESSION, action: Action.CREATE },
      { resource: Resource.SUPPORT_SESSION, action: Action.READ },
      { resource: Resource.SUPPORT_SESSION, action: Action.UPDATE },
      
      // Messages for crisis support
      { resource: Resource.MESSAGE, action: Action.CREATE },
      { resource: Resource.MESSAGE, action: Action.READ },
      
      // Limited user access for crisis response
      { resource: Resource.USER, action: Action.READ },
      { resource: Resource.USER_PROFILE, action: Action.READ },
    ],
  },

  // Helper - Peer support provider
  HELPER: {
    name: 'HELPER',
    description: 'Certified peer support provider',
    priority: 50,
    permissions: [
      // Helper profile management
      { resource: Resource.HELPER_PROFILE, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.HELPER_PROFILE, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      
      // Support sessions
      { resource: Resource.SUPPORT_SESSION, action: Action.CREATE },
      { resource: Resource.SUPPORT_SESSION, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.SUPPORT_SESSION, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      
      // Peer support
      { resource: Resource.PEER_SUPPORT, action: Action.CREATE },
      { resource: Resource.PEER_SUPPORT, action: Action.READ },
      { resource: Resource.PEER_SUPPORT, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      
      // Community participation
      { resource: Resource.COMMUNITY_POST, action: Action.CREATE },
      { resource: Resource.COMMUNITY_POST, action: Action.READ },
      { resource: Resource.COMMUNITY_POST, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.COMMUNITY_COMMENT, action: Action.CREATE },
      { resource: Resource.COMMUNITY_COMMENT, action: Action.READ },
      
      // Messages with users seeking support
      { resource: Resource.MESSAGE, action: Action.CREATE },
      { resource: Resource.MESSAGE, action: Action.READ, conditions: [{ type: 'ownership' }] },
      
      // Limited wellness features access
      { resource: Resource.WELLNESS_CHALLENGE, action: Action.READ },
      { resource: Resource.WELLNESS_GOAL, action: Action.READ },
    ],
  },

  // User - Regular platform user
  USER: {
    name: 'USER',
    description: 'Regular platform user',
    priority: 10,
    permissions: [
      // Own profile management
      { resource: Resource.USER_PROFILE, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.USER_PROFILE, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.USER_DATA, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.USER_DATA, action: Action.EXPORT, conditions: [{ type: 'ownership' }] },
      
      // Own sessions
      { resource: Resource.USER_SESSION, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.USER_SESSION, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      
      // Wellness features - full access to own data
      { resource: Resource.MOOD_ENTRY, action: Action.CREATE },
      { resource: Resource.MOOD_ENTRY, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.MOOD_ENTRY, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.MOOD_ENTRY, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      
      { resource: Resource.JOURNAL_ENTRY, action: Action.CREATE },
      { resource: Resource.JOURNAL_ENTRY, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.JOURNAL_ENTRY, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.JOURNAL_ENTRY, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      
      { resource: Resource.WELLNESS_GOAL, action: Action.CREATE },
      { resource: Resource.WELLNESS_GOAL, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.WELLNESS_GOAL, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.WELLNESS_GOAL, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      
      // Wellness challenges - participate
      { resource: Resource.WELLNESS_CHALLENGE, action: Action.READ },
      { resource: Resource.WELLNESS_CHALLENGE, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      
      // Safety plan - own plan only
      { resource: Resource.SAFETY_PLAN, action: Action.CREATE },
      { resource: Resource.SAFETY_PLAN, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.SAFETY_PLAN, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      
      // Emergency contacts - own contacts
      { resource: Resource.EMERGENCY_CONTACT, action: Action.CREATE },
      { resource: Resource.EMERGENCY_CONTACT, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.EMERGENCY_CONTACT, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.EMERGENCY_CONTACT, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      
      // Community participation
      { resource: Resource.COMMUNITY_POST, action: Action.CREATE },
      { resource: Resource.COMMUNITY_POST, action: Action.READ },
      { resource: Resource.COMMUNITY_POST, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.COMMUNITY_POST, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      
      { resource: Resource.COMMUNITY_COMMENT, action: Action.CREATE },
      { resource: Resource.COMMUNITY_COMMENT, action: Action.READ },
      { resource: Resource.COMMUNITY_COMMENT, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.COMMUNITY_COMMENT, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      
      { resource: Resource.COMMUNITY_GROUP, action: Action.READ },
      { resource: Resource.COMMUNITY_GROUP, action: Action.CREATE },
      
      // Messages
      { resource: Resource.MESSAGE, action: Action.CREATE },
      { resource: Resource.MESSAGE, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.MESSAGE, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      
      // Notifications
      { resource: Resource.NOTIFICATION, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.NOTIFICATION, action: Action.UPDATE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.NOTIFICATION, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      
      // File management - own files
      { resource: Resource.FILE, action: Action.CREATE },
      { resource: Resource.FILE, action: Action.READ, conditions: [{ type: 'ownership' }] },
      { resource: Resource.FILE, action: Action.DELETE, conditions: [{ type: 'ownership' }] },
      { resource: Resource.FILE_EXPORT, action: Action.CREATE, conditions: [{ type: 'ownership' }] },
      
      // Crisis reporting
      { resource: Resource.CRISIS_ALERT, action: Action.CREATE },
      { resource: Resource.CRISIS_REPORT, action: Action.CREATE },
      { resource: Resource.CRISIS_REPORT, action: Action.READ, conditions: [{ type: 'ownership' }] },
    ],
  },
};

// Helper function to get all permissions for a role (including inherited)
export function getRolePermissions(roleName: string): Permission[] {
  const role = SYSTEM_ROLES[roleName];
  if (!role) return [];

  let permissions = [...role.permissions];

  // Add inherited permissions
  if (role.inherits) {
    for (const inheritedRole of role.inherits) {
      permissions = [...permissions, ...getRolePermissions(inheritedRole)];
    }
  }

  // Remove duplicates
  const uniquePermissions = new Map<string, Permission>();
  permissions.forEach(perm => {
    const key = `${perm.resource}:${perm.action}`;
    if (!uniquePermissions.has(key) || !perm.conditions) {
      uniquePermissions.set(key, perm);
    }
  });

  return Array.from(uniquePermissions.values());
}

// Check if a role has a specific permission
export function hasPermission(
  roleName: string,
  resource: Resource,
  action: Action,
  context?: any
): boolean {
  const permissions = getRolePermissions(roleName);
  
  return permissions.some(perm => {
    if (perm.resource !== resource || perm.action !== action) {
      return false;
    }

    // Check conditions if present
    if (perm.conditions && perm.conditions.length > 0) {
      return perm.conditions.every(condition => {
        if (condition.evaluator) {
          return condition.evaluator(context);
        }

        if (condition.type === 'ownership') {
          return context?.userId === context?.resourceOwnerId;
        }

        // Add more condition evaluations as needed
        return true;
      });
    }

    return true;
  });
}

// Get all resources a role can access
export function getRoleResources(roleName: string): Resource[] {
  const permissions = getRolePermissions(roleName);
  const resources = new Set<Resource>();
  
  permissions.forEach(perm => {
    resources.add(perm.resource);
  });

  return Array.from(resources);
}

// Get all actions a role can perform on a resource
export function getRoleActions(roleName: string, resource: Resource): Action[] {
  const permissions = getRolePermissions(roleName);
  const actions = new Set<Action>();
  
  permissions.forEach(perm => {
    if (perm.resource === resource) {
      actions.add(perm.action);
    }
  });

  return Array.from(actions);
}