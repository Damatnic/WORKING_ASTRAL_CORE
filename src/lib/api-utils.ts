import * as crypto from 'crypto';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';

// Encryption utilities for sensitive data
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'),
    iv
  );
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex'),
    iv
  );
  
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString();
}

// Field-level encryption for sensitive data (API utilities)
export function encryptApiField(data: any): string {
  if (typeof data === 'string') {
    return encrypt(data);
  }
  return encrypt(JSON.stringify(data));
}

export function decryptApiField(encryptedData: string): any {
  try {
    const decrypted = decrypt(encryptedData);
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// Audit logging helper
export async function createAuditLog({
  userId,
  action,
  resource,
  resourceId,
  details,
  outcome,
  ipAddress,
  userAgent,
}: {
  userId?: string | null;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: any;
  outcome: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        action,
        resource,
        resourceId,
        details: details ? JSON.stringify(details) : null as any,
        outcome,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Audit log creation failed:', error);
  }
}

// Request validation helpers
export function validateRequest<T>(
  data: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: (error as z.ZodError).issues.map(e => e.message).join(', ') };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// Pagination helper
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
  
  return { page, limit, sortBy, sortOrder };
}

export function getPaginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  };
}

// Search and filter helpers
export function buildWhereClause(searchParams: URLSearchParams, allowedFilters: string[]) {
  const where: any = {};
  
  // Handle search query
  const search = searchParams.get('search');
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  // Handle filters
  allowedFilters.forEach(filter => {
    const value = searchParams.get(filter);
    if (value) {
      if (value === 'true' || value === 'false') {
        where[filter] = value === 'true';
      } else if (filter.includes('Date') || filter.includes('At')) {
        // Handle date filters
        const dateValue = new Date(value);
        if (!isNaN(dateValue.getTime())) {
          where[filter] = dateValue;
        }
      } else {
        where[filter] = value;
      }
    }
  });
  
  return where;
}

// Rate limiting store (in-memory for now, should use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: maxRequests - 1, resetTime };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime };
}

// Security headers helper
export function setSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

// Error response helper
export function errorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  const response = NextResponse.json(
    {
      error: message,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
  
  return setSecurityHeaders(response);
}

// Success response helper
export function successResponse(
  data: any,
  status: number = 200,
  meta?: any
): NextResponse {
  const response = NextResponse.json(
    {
      success: true,
      data,
      meta,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
  
  return setSecurityHeaders(response);
}

// Data sanitization helper
export function sanitizeUserData(user: any) {
  const {
    hashedPassword,
    twoFactorSecret,
    failedLoginAttempts,
    lockedUntil,
    ...sanitized
  } = user;
  
  return sanitized;
}

// Export data formatting helper
export function formatForExport(data: any, format: 'json' | 'csv' = 'json') {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }
  
  // CSV formatting
  if (Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }
  
  return '';
}

// Input sanitization schemas
export const userUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  dateOfBirth: z.string().datetime().optional(),
  timezone: z.string().optional(),
  preferredLanguage: z.string().length(2).optional(),
});

export const moodEntrySchema = z.object({
  moodScore: z.number().min(1).max(10),
  anxietyLevel: z.number().min(1).max(10).optional(),
  energyLevel: z.number().min(1).max(10).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
});

export const journalEntrySchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).optional(),
  isPrivate: z.boolean().optional(),
});

export const wellnessGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  targetDate: z.string().datetime().optional(),
  category: z.enum(['mental', 'physical', 'social', 'spiritual', 'professional']),
  milestones: z.array(z.object({
    title: z.string(),
    completed: z.boolean(),
  })).optional(),
});

// RBAC permission checker
export function checkPermission(
  userRole: UserRole,
  action: string,
  resource: string
): boolean {
  const permissions: Record<UserRole, string[]> = {
    [UserRole.USER]: [
      'read:own_profile',
      'update:own_profile',
      'delete:own_profile',
      'create:own_content',
      'read:own_content',
      'update:own_content',
      'delete:own_content',
    ],
    [UserRole.HELPER]: [
      'read:own_profile',
      'update:own_profile',
      'read:assigned_users',
      'create:session_notes',
      'read:session_notes',
    ],
    [UserRole.THERAPIST]: [
      'read:own_profile',
      'update:own_profile',
      'read:assigned_users',
      'create:session_notes',
      'read:session_notes',
      'create:treatment_plans',
      'update:treatment_plans',
    ],
    [UserRole.CRISIS_COUNSELOR]: [
      'read:crisis_reports',
      'create:crisis_interventions',
      'update:crisis_reports',
      'escalate:emergencies',
    ],
    [UserRole.ADMIN]: [
      'read:all_users',
      'update:all_users',
      'delete:users',
      'read:analytics',
      'read:reports',
      'manage:helpers',
      'moderate:content',
    ],
    [UserRole.SUPER_ADMIN]: [
      'all:permissions',
    ],
  };
  
  const userPermissions = permissions[userRole] || [];
  const permissionString = `${action}:${resource}`;
  
  return userPermissions.includes('all:permissions') || 
         userPermissions.includes(permissionString);
}

// Get client IP address
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             'unknown';
  return ip;
}

// Generate secure random token
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Hash sensitive data
export async function hashData(data: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify hashed data
export async function verifyHash(data: string, hashedData: string): Promise<boolean> {
  const [salt, hash] = hashedData.split(':');
  const verifyHash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}