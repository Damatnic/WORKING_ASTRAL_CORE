import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/types/api';

// Base validation schemas
export const emailSchema = z.string().email('Invalid email format');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format');
export const uuidSchema = z.string().uuid('Invalid ID format');

// User validation schemas
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  phoneNumber: phoneSchema.optional(),
  dateOfBirth: z.coerce.date().optional(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms'),
});

export const userUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  displayName: z.string().max(100).optional(),
  phoneNumber: phoneSchema.optional(),
  dateOfBirth: z.coerce.date().optional(),
  timezone: z.string().optional(),
  preferredLanguage: z.string().optional(),
});

// Crisis report validation schemas
export const crisisReportSchema = z.object({
  severityLevel: z.number().min(1).max(5),
  triggerType: z.enum(['self_harm', 'suicidal_ideation', 'substance_abuse', 'domestic_violence', 'panic_attack', 'psychotic_episode', 'other']),
  interventionType: z.enum(['immediate_response', 'safety_planning', 'emergency_contact', 'professional_referral', 'follow_up', 'escalation']),
  details: z.string().min(10, 'Details must be at least 10 characters'),
  isAnonymous: z.boolean().default(false),
  emergencyContacts: z.array(z.string()).optional(),
});

// Wellness goal validation schemas
export const wellnessGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description too long'),
  category: z.string().min(1, 'Category is required'),
  targetDate: z.coerce.date().min(new Date(), 'Target date must be in the future'),
  milestones: z.array(z.string().min(1)).min(1, 'At least one milestone is required'),
});

// Notification validation schemas
export const notificationPreferencesSchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  crisis: z.boolean(),
  marketing: z.boolean(),
  digestFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'NEVER']),
  crisisOverride: z.boolean(),
});

// Session validation schemas
export const sessionSchema = z.object({
  clientId: uuidSchema,
  therapistId: uuidSchema,
  scheduledTime: z.coerce.date().min(new Date(), 'Scheduled time must be in the future'),
  duration: z.number().min(15).max(180, 'Session duration must be between 15-180 minutes'),
  type: z.enum(['VIDEO', 'IN_PERSON', 'PHONE']),
  notes: z.string().max(1000).optional(),
});

// Search validation schemas
export const searchFiltersSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  type: z.array(z.string()).optional(),
  category: z.array(z.string()).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Pagination validation schema
export const paginationSchema = z.object({
  page: z.coerce.number().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().min(1).max(100, 'Limit must be between 1-100').default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// File upload validation schema
export const fileUploadSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});

// Validation middleware
export function validateRequest<T>(schema: z.ZodSchema<T>) {
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
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        return NextResponse.json(
          createErrorResponse('Validation failed', errorMessages.map(e => `${e.field}: ${e.message}`).join(', ')),
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
export function validateQueryParams<T>(schema: z.ZodSchema<T>, request: NextRequest): T {
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
  return z.custom<T>(validator, { message });
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

export default {
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