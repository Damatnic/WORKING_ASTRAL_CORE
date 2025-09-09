import { z as zod } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/types/api';

// Base validation schemas
export const emailSchema = zod.string().email('Invalid email format');
export const passwordSchema = zod.string().min(8, 'Password must be at least 8 characters');
export const phoneSchema = zod.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format');
export const uuidSchema = zod.string().uuid('Invalid ID format');

// User validation schemas
export const userRegistrationSchema = zod.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: zod.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: zod.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phoneNumber: phoneSchema.optional(),
  dateOfBirth: zod.coerce.date().optional(),
  acceptTerms: zod.boolean().refine((val: boolean) => val === true, 'You must accept the terms'),
});

export const userUpdateSchema = zod.object({
  firstName: zod.string().min(1).max(50).optional(),
  lastName: zod.string().min(1).max(50).optional(),
  displayName: zod.string().max(100).optional(),
  phoneNumber: phoneSchema.optional(),
  dateOfBirth: zod.coerce.date().optional(),
  timezone: zod.string().optional(),
  preferredLanguage: zod.string().optional(),
});

// Crisis report validation schemas
export const crisisReportSchema = zod.object({
  severityLevel: zod.number().min(1).max(5),
  triggerType: zod.enum(['self_harm', 'suicidal_ideation', 'substance_abuse', 'domestic_violence', 'panic_attack', 'psychotic_episode', 'other']),
  interventionType: zod.enum(['immediate_response', 'safety_planning', 'emergency_contact', 'professional_referral', 'follow_up', 'escalation']),
  details: zod.string().min(10, 'Details must be at least 10 characters'),
  isAnonymous: zod.boolean().default(false),
  emergencyContacts: zod.array(zod.string()).optional(),
});

// Wellness goal validation schemas
export const wellnessGoalSchema = zod.object({
  title: zod.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: zod.string().min(10, 'Description must be at least 10 characters').max(500, 'Description too long'),
  category: zod.string().min(1, 'Category is required'),
  targetDate: zod.coerce.date().min(new Date(), 'Target date must be in the future'),
  milestones: zod.array(zod.string().min(1)).min(1, 'At least one milestone is required'),
});

// Notification validation schemas
export const notificationPreferencesSchema = zod.object({
  email: zod.boolean(),
  push: zod.boolean(),
  crisis: zod.boolean(),
  marketing: zod.boolean(),
  digestFrequency: zod.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'NEVER']),
  crisisOverride: zod.boolean(),
});

// Session validation schemas
export const sessionSchema = zod.object({
  clientId: uuidSchema,
  therapistId: uuidSchema,
  scheduledTime: zod.coerce.date().min(new Date(), 'Scheduled time must be in the future'),
  duration: zod.number().min(15).max(180, 'Session duration must be between 15-180 minutes'),
  type: zod.enum(['VIDEO', 'IN_PERSON', 'PHONE']),
  notes: zod.string().max(1000).optional(),
});

// Search validation schemas
export const searchFiltersSchema = zod.object({
  query: zod.string().min(1, 'Search query is required'),
  type: zod.array(zod.string()).optional(),
  category: zod.array(zod.string()).optional(),
  dateFrom: zod.coerce.date().optional(),
  dateTo: zod.coerce.date().optional(),
  author: zod.string().optional(),
  tags: zod.array(zod.string()).optional(),
});

// Pagination validation schema
export const paginationSchema = zod.object({
  page: zod.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: zod.coerce.number().min(1).max(100, 'Limit must be between 1-100').default(10),
  sortBy: zod.string().optional(),
  sortOrder: zod.enum(['asc', 'desc']).default('desc'),
});

// File upload validation schema
export const fileUploadSchema = zod.object({
  category: zod.string().min(1, 'Category is required'),
  isPublic: zod.boolean().default(false),
  metadata: zod.record(zod.any()).optional(),
});

// Validation middleware
export function validateRequest<T>(schema: any) {
  return async (request: NextRequest): Promise<{ data: T } | NextResponse> => {
    try {
      let body: any;
      
      // Handle different content types
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        body = await request.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        body = Object.fromEntries(formData.entries());
      } else if (request.method === 'GET') {
        // For GET requests, validate query parameters
        const url = new URL(request.url);
        body = Object.fromEntries(url.searchParams.entries());
      } else {
        return NextResponse.json(
          createErrorResponse('Unsupported content type'),
          { status: 400 }
        );
      }

      const validatedData = schema.parse(body);
      return { data: validatedData };
    } catch (error) {
      if (error instanceof zod.ZodError) {
        const errorMessages = (error as any).errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        return NextResponse.json(
          createErrorResponse('Validation failed', errorMessages.map((e: any) => `${e.field}: ${e.message}`).join(', ')),
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        createErrorResponse('Invalid request format'),
        { status: 400 }
      );
    }
  };
}

// Query parameter validation helper
export function validateQueryParams<T>(schema: any, request: NextRequest): T {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  return schema.parse(params);
}

// Common validation patterns
export const commonValidation = {
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  uuid: uuidSchema,
  pagination: paginationSchema,
  
  // Helper functions
  isValidEmail: (email: string): boolean => {
    try {
      emailSchema.parse(email);
      return true;
    } catch {
      return false;
    }
  },
  
  isValidUUID: (id: string): boolean => {
    try {
      uuidSchema.parse(id);
      return true;
    } catch {
      return false;
    }
  },
  
  sanitizeHtml: (input: string): string => {
    // Basic HTML sanitization - in production, use a proper library like DOMPurify
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  },
  
  normalizeEmail: (email: string): string => {
    return email.toLowerCase().trim();
  },
  
  formatPhoneNumber: (phone: string): string => {
    // Remove all non-digits except +
    return phone.replace(/[^\d+]/g, '');
  },
};

// Export validation error type
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// Custom validation decorators
export function createCustomValidation<T>(
  validator: (value: T) => boolean | Promise<boolean>,
  message: string
) {
  return zod.custom(validator, { message }) as any;
}

// Database-specific validations
export const dbValidation = {
  // Validate that a user exists
  userExists: createCustomValidation(
    async (userId: string) => {
      // This would check the database - implementation depends on your DB setup
      return commonValidation.isValidUUID(userId);
    },
    'User does not exist'
  ),
  
  // Validate unique email
  uniqueEmail: createCustomValidation(
    async (email: string) => {
      // This would check the database for email uniqueness
      return commonValidation.isValidEmail(email);
    },
    'Email already exists'
  ),
};

const ValidationUtils = {
  schemas: {
    userRegistration: userRegistrationSchema,
    userUpdate: userUpdateSchema,
    crisisReport: crisisReportSchema,
    wellnessGoal: wellnessGoalSchema,
    notificationPreferences: notificationPreferencesSchema,
    session: sessionSchema,
    searchFilters: searchFiltersSchema,
    pagination: paginationSchema,
    fileUpload: fileUploadSchema,
  },
  middleware: {
    validateRequest,
    validateQueryParams,
  },
  common: commonValidation,
  db: dbValidation,
};

export default ValidationUtils;