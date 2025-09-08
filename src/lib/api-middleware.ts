import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions, hasRole, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import rateLimit from '@/lib/rate-limit';

// HIPAA compliance headers
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';");
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  return response;
}

// Authentication middleware
export async function requireAuth(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!(session as any)?.user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Authentication required' },
      { status: 401 }
    );
  }
  
  const sessionUser = (session as any).user;
  
  // Update last active timestamp
  await (prisma as any).user.update({
    where: { id: sessionUser.id },
    data: { lastActiveAt: new Date() }
  }).catch(() => {}); // Silent fail
  
  return session;
}

// Role-based access control
export async function requireRole(req: NextRequest, allowedRoles: UserRole[]) {
  const session = await requireAuth(req);
  
  if (session instanceof NextResponse) {
    return session; // Auth failed, return error response
  }
  
  const sessionUser = (session as any).user;
  
  if (!hasRole(sessionUser.role, allowedRoles)) {
    // Log unauthorized access attempt
    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: 'unauthorized_access',
        resource: req.url,
        details: {
          requiredRoles: allowedRoles,
          userRole: sessionUser.role,
          method: req.method,
        },
        outcome: 'failure',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
        userAgent: req.headers.get('user-agent') || '',
      }
    }).catch(() => {});
    
    return NextResponse.json(
      { error: 'Forbidden', message: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  
  return session;
}

// Permission-based access control
export async function requirePermission(req: NextRequest, permission: string) {
  const session = await requireAuth(req);
  
  if (session instanceof NextResponse) {
    return session;
  }
  
  const sessionUser = (session as any).user;
  
  if (!hasPermission(sessionUser.role, permission)) {
    await prisma.auditLog.create({
      data: {
        userId: sessionUser.id,
        action: 'permission_denied',
        resource: req.url,
        details: {
          requiredPermission: permission,
          userRole: sessionUser.role,
          method: req.method,
        },
        outcome: 'failure',
        ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '',
        userAgent: req.headers.get('user-agent') || '',
      }
    }).catch(() => {});
    
    return NextResponse.json(
      { error: 'Forbidden', message: `Missing required permission: ${permission}` },
      { status: 403 }
    );
  }
  
  return session;
}

// Audit logging helper
export async function auditLog(
  userId: string | null,
  action: string,
  resource: string,
  resourceId?: string,
  details?: any,
  outcome: 'success' | 'failure' = 'success',
  req?: NextRequest
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        details: details ? JSON.stringify(details) : null as any,
        outcome,
        ipAddress: req ? (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '') : null,
        userAgent: req ? (req.headers.get('user-agent') || '') : null,
      }
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

// Input validation helper
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid input', (error as z.ZodError).issues);
    }
    throw error;
  }
}

// Custom validation error
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Error response helper
export function errorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred'
): NextResponse {
  console.error('API Error:', error);
  
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: 'Validation Error',
        message: error.message,
        errors: error.errors,
      },
      { status: 400 }
    );
  }
  
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === 'development' 
      ? error.message 
      : defaultMessage;
      
    return NextResponse.json(
      { error: 'Error', message },
      { status: 500 }
    );
  }
  
  return NextResponse.json(
    { error: 'Error', message: defaultMessage },
    { status: 500 }
  );
}

// Success response helper
export function successResponse(
  data: any,
  message?: string,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
  
  return addSecurityHeaders(response);
}

// Paginated response helper
export function paginatedResponse(
  data: any[],
  total: number,
  page: number,
  limit: number,
  message?: string
): NextResponse {
  const response = NextResponse.json(
    {
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    },
    { status: 200 }
  );
  
  return addSecurityHeaders(response);
}

// Client consent verification
export async function verifyClientConsent(
  therapistId: string,
  clientId: string
): Promise<boolean> {
  try {
    // Check if there's an active therapy relationship with consent
    const session = await prisma.supportSession.findFirst({
      where: {
        helperId: therapistId,
        userId: clientId,
        status: 'active',
      },
    });
    
    return !!session;
  } catch (error) {
    console.error('Consent verification error:', error);
    return false;
  }
}

// Data retention policy check
export async function checkDataRetention(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dataRetentionDays: true, createdAt: true },
    });
    
    if (!user) return false;
    
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - user.dataRetentionDays);
    
    return user.createdAt > retentionDate;
  } catch (error) {
    console.error('Data retention check error:', error);
    return false;
  }
}

// HIPAA-compliant data sanitization
export function sanitizeTherapyData(data: any): any {
  const sensitiveFields = [
    'ssn', 'socialSecurityNumber', 'dateOfBirth', 'dob',
    'insuranceId', 'policyNumber', 'medicalRecordNumber',
    'phoneNumber', 'address', 'email'
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}