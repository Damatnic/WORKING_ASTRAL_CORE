import { prisma } from './prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

// Helper function to generate just the base fields (id, timestamps)
export function generatePrismaCreateFields(data: Record<string, any> = {}, userId?: string): Record<string, any> {
  const baseFields: Record<string, any> = {
    id: crypto.randomUUID(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  if (userId) {
    baseFields.userId = userId;
  }

  return baseFields;
}

// Helper function to generate just base ID and timestamps
export function generateBaseFields() {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper function to generate Prisma update fields
export function generatePrismaUpdateFields(data: Record<string, any>) {
  return {
    ...data,
    updatedAt: new Date(),
  };
}

// Helper function to safely get user by ID with role validation
export async function getUserWithRoleValidation(
  userId: string, 
  requiredRoles?: UserRole[]
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userProfile: true,
      helperProfile: true,
      adminProfile: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.isActive) {
    throw new Error('User account is deactivated');
  }

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }

  return user;
}

// Helper function to create audit log entry
export async function createAuditLog(data: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  outcome: 'success' | 'failure' | 'pending';
}) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: data.userId || null,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId || null,
        details: data.details || {},
        outcome: data.outcome,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    // Silent fail for audit logs to not break main functionality
    console.error('Failed to create audit log:', error);
    return null;
  }
}

// Helper function to handle Prisma soft deletes
export function createSoftDeletedField() {
  return {
    deletedAt: null,
  };
}

export function markAsDeleted() {
  return {
    deletedAt: new Date(),
    updatedAt: new Date(),
  };
}

// Helper function to add standard filters for soft deletes
export function excludeDeleted() {
  return {
    deletedAt: null,
  };
}

// Helper function for pagination
export function createPaginationArgs(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  return {
    skip,
    take: limit,
  };
}

// Helper function to get total count for pagination
export async function getPaginatedResults<T>(
  model: any,
  where: any = {},
  page: number = 1,
  limit: number = 10,
  orderBy: any = { createdAt: 'desc' },
  include?: any
) {
  const paginationArgs = createPaginationArgs(page, limit);
  const whereClause = { ...where, ...excludeDeleted() };

  const [data, total] = await Promise.all([
    model.findMany({
      where: whereClause,
      ...paginationArgs,
      orderBy,
      ...(include && { include }),
    }),
    model.count({ where: whereClause }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrevious: page > 1,
    },
  };
}

// Helper function for search with full-text search
export function createSearchQuery(query: string, fields: string[]) {
  if (!query) return {};
  
  return {
    OR: fields.map(field => ({
      [field]: {
        contains: query,
        mode: 'insensitive' as const,
      },
    })),
  };
}

// Helper function to handle user anonymization for crisis reports
export function anonymizeUserData(userData: any) {
  return {
    anonymousId: userData.anonymousId,
    // Don't include actual user details for anonymous reports
    role: userData.role,
    createdAt: userData.createdAt,
  };
}

// Helper function to check if user has permission for resource
export async function checkResourcePermission(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string
) {
  const user = await getUserWithRoleValidation(userId);
  
  // Super admin has access to everything
  if (user.role === UserRole.SUPER_ADMIN) {
    return true;
  }

  // Resource-specific permission checks
  switch (resourceType) {
    case 'crisis_report':
      return [UserRole.CRISIS_COUNSELOR, UserRole.ADMIN].includes(user.role);
    case 'user_profile':
      // Users can access their own profile, admins can access any
      if (action === 'read' || action === 'update') {
        return userId === resourceId || [UserRole.ADMIN].includes(user.role);
      }
      return [UserRole.ADMIN].includes(user.role);
    case 'therapy_session':
      return [UserRole.THERAPIST, UserRole.ADMIN].includes(user.role);
    default:
      return false;
  }
}

// Helper function to format Prisma date fields for JSON responses
export function formatPrismaResponse(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Date) {
    return data.toISOString();
  }

  if (Array.isArray(data)) {
    return data.map(formatPrismaResponse);
  }

  if (typeof data === 'object') {
    const formatted: any = {};
    for (const [key, value] of Object.entries(data)) {
      formatted[key] = formatPrismaResponse(value);
    }
    return formatted;
  }

  return data;
}

// Helper function to validate and sanitize user input for database operations
export function sanitizeForDatabase(data: Record<string, any>) {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue; // Skip undefined values
    }
    
    if (typeof value === 'string') {
      // Basic sanitization - trim whitespace and handle empty strings
      const trimmed = value.trim();
      sanitized[key] = trimmed === '' ? null : trimmed;
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Helper function to create database transaction wrapper
export async function withTransaction<T>(
  operation: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(operation);
}

// Helper function to handle common database errors
export function handlePrismaError(error: any) {
  if (error.code === 'P2002') {
    return new Error('A record with this information already exists');
  }
  
  if (error.code === 'P2025') {
    return new Error('Record not found');
  }
  
  if (error.code === 'P2003') {
    return new Error('Invalid reference to related record');
  }
  
  if (error.code === 'P2016') {
    return new Error('Query interpretation error');
  }
  
  // Return original error for other cases
  return error;
}

// Helper function to convert Zod validation errors to validation errors
export function convertZodIssuesToValidationErrors(issues: z.ZodIssue[]) {
  return issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

// Helper function to create audit log data
export function createAuditLogData(data: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  outcome: 'success' | 'failure' | 'pending';
}) {
  return {
    userId: data.userId || null,
    action: data.action,
    resource: data.resource,
    resourceId: data.resourceId || null,
    details: data.details || {},
    outcome: data.outcome,
    createdAt: new Date(),
  };
}

// Named default export object
const PrismaHelpers = {
  generatePrismaCreateFields,
  generatePrismaUpdateFields,
  getUserWithRoleValidation,
  createAuditLog,
  createSoftDeletedField,
  markAsDeleted,
  excludeDeleted,
  createPaginationArgs,
  getPaginatedResults,
  createSearchQuery,
  anonymizeUserData,
  checkResourcePermission,
  formatPrismaResponse,
  sanitizeForDatabase,
  withTransaction,
  handlePrismaError,
  convertZodIssuesToValidationErrors,
  createAuditLogData,
};

export default PrismaHelpers;