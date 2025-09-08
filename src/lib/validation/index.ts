// Comprehensive Validation System for Astral Core Mental Health Platform
// This provides runtime type checking, validation, and security sanitization

import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError, ValidationResult } from '@/types';
import { UUID, Email, PhoneNumber, isUUID, isEmail } from '@/types';

// Import enhanced validation components (commented out to resolve conflicts)
// import ValidationService from './validation-service';
// import ValidationMiddleware, {
//   withValidation,
//   withSanitization,
//   withSecurity,
//   getSanitizedBody,
//   getSecurityContext
// } from './validation-middleware';
// import {
//   SecureSchemas,
//   EnhancedUserSchemas,
//   EnhancedAuthSchemas,
//   EnhancedWellnessSchemas,
//   EnhancedCrisisSchemas,
//   EnhancedCommunitySchemas,
//   EnhancedFileSchemas,
//   EnhancedSearchSchemas,
//   ValidationUtils
// } from './schemas';
// import {
//   useFormValidation,
//   useFieldValidation,
//   formatValidationError,
//   getSecurityLevelColor,
//   createPasswordValidationRule,
//   createEmailUniquenessRule,
//   createMedicalTextRule,
//   type FormValidationConfig,
//   type FieldValidationResult,
//   type CustomValidationRule
// } from './form-validators';

// Base validation schemas
export const BaseValidationSchemas = {
  uuid: z.string().refine(isUUID, { message: 'Must be a valid UUID' }),
  email: z.string().email('Must be a valid email address'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Must be a valid phone number'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  url: z.string().url('Must be a valid URL'),
  nonEmptyString: z.string().min(1, 'Cannot be empty'),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().nonnegative('Must be non-negative'),
  timestamp: z.union([z.string().datetime(), z.date()]),
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
};

// User validation schemas
export const UserValidationSchemas = {
  userRole: z.enum(['REGULAR_USER', 'HELPER', 'THERAPIST', 'CRISIS_COUNSELOR', 'ADMIN', 'SUPER_ADMIN']),
  userStatus: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'DELETED']),
  presenceStatus: z.enum(['online', 'away', 'busy', 'offline']),
  
  createUser: z.object({
    email: BaseValidationSchemas.email,
    password: BaseValidationSchemas.password,
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    displayName: z.string().min(1).max(100).optional(),
    phoneNumber: BaseValidationSchemas.phoneNumber.optional(),
    role: z.enum(['REGULAR_USER', 'HELPER', 'THERAPIST', 'CRISIS_COUNSELOR']).default('REGULAR_USER'),
    acceptedTerms: z.boolean().refine(val => val === true, 'Must accept terms and conditions'),
    acceptedPrivacy: z.boolean().refine(val => val === true, 'Must accept privacy policy'),
    marketingConsent: z.boolean().optional().default(false)
  }),
  
  updateUser: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    displayName: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).optional(),
    phoneNumber: BaseValidationSchemas.phoneNumber.optional(),
    timezone: z.string().optional(),
    locale: z.string().optional()
  })
};

// Authentication validation schemas
export const AuthValidationSchemas = {
  login: z.object({
    email: BaseValidationSchemas.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
    mfaCode: z.string().optional(),
    captchaToken: z.string().optional()
  }),
  
  register: z.object({
    email: BaseValidationSchemas.email,
    password: BaseValidationSchemas.password,
    confirmPassword: z.string(),
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    displayName: z.string().min(1).max(100).optional(),
    acceptedTerms: z.boolean().refine(val => val === true, 'Must accept terms and conditions'),
    acceptedPrivacy: z.boolean().refine(val => val === true, 'Must accept privacy policy'),
    invitationCode: z.string().optional()
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  }),
  
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: BaseValidationSchemas.password,
    confirmPassword: z.string()
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"]
  }),
  
  resetPassword: z.object({
    email: BaseValidationSchemas.email,
    captchaToken: z.string().optional()
  }),
  
  resetPasswordConfirm: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: BaseValidationSchemas.password,
    confirmPassword: z.string()
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"]
  })
};

// Crisis validation schemas
export const CrisisValidationSchemas = {
  crisisType: z.enum(['self_harm', 'suicide_ideation', 'substance_abuse', 'domestic_violence', 'mental_health_emergency', 'panic_attack', 'psychotic_episode', 'other']),
  crisisSeverity: z.enum(['low', 'medium', 'high', 'critical']),
  crisisStatus: z.enum(['open', 'acknowledged', 'in_progress', 'resolved', 'escalated', 'closed']),
  riskLevel: z.enum(['none', 'low', 'moderate', 'high', 'imminent']),
  
  createAlert: z.object({
    type: z.enum(['self_harm', 'suicide_ideation', 'substance_abuse', 'domestic_violence', 'mental_health_emergency', 'panic_attack', 'psychotic_episode', 'other']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string().min(10).max(1000),
    context: z.string().max(2000).optional(),
    location: z.object({
      type: z.enum(['exact', 'approximate', 'unknown']).optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      coordinates: z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        accuracy: z.number().positive()
      }).optional()
    }).optional(),
    contactInfo: z.object({
      phoneNumber: BaseValidationSchemas.phoneNumber.optional(),
      alternateContact: z.object({
        name: z.string().min(1).max(100),
        relationship: z.string().min(1).max(50),
        phoneNumber: BaseValidationSchemas.phoneNumber
      }).optional(),
      preferredContactMethod: z.enum(['phone', 'text', 'chat', 'video'])
    }).optional(),
    metadata: z.record(z.string(), z.any()).optional()
  }),
  
  updateAlert: z.object({
    status: z.enum(['open', 'acknowledged', 'in_progress', 'resolved', 'escalated', 'closed']).optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assignedCounselorId: BaseValidationSchemas.uuid.optional(),
    notes: z.string().max(2000).optional(),
    escalationLevel: z.number().int().min(1).max(5).optional()
  }),
  
  safetyPlan: z.object({
    personalWarningSigns: z.array(z.string().min(1).max(200)).min(1),
    internalCopingStrategies: z.array(z.string().min(1).max(200)).min(1),
    socialSupports: z.array(z.object({
      name: z.string().min(1).max(100),
      relationship: z.string().min(1).max(50),
      phoneNumber: BaseValidationSchemas.phoneNumber,
      role: z.enum(['distraction', 'support', 'help_remove_means'])
    })).min(1),
    professionalContacts: z.array(z.object({
      name: z.string().min(1).max(100),
      title: z.string().min(1).max(100),
      organization: z.string().min(1).max(200),
      phoneNumber: BaseValidationSchemas.phoneNumber,
      type: z.enum(['therapist', 'psychiatrist', 'crisis_line', 'emergency']),
      availability: z.string().min(1).max(100)
    })).min(1),
    environmentalSafety: z.object({
      meansRestriction: z.array(z.string().min(1).max(200)),
      safeEnvironmentPlans: z.array(z.string().min(1).max(200))
    }),
    emergencyContacts: z.array(z.object({
      organization: z.string().min(1).max(200),
      phoneNumber: BaseValidationSchemas.phoneNumber,
      when: z.string().min(1).max(200)
    })).min(1)
  })
};

// Therapy validation schemas
export const TherapyValidationSchemas = {
  sessionType: z.enum(['individual', 'group', 'family', 'couples', 'consultation', 'assessment']),
  sessionStatus: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']),
  sessionFormat: z.enum(['in_person', 'video', 'phone', 'chat']),
  progressRating: z.number().int().min(1).max(10),
  
  createSession: z.object({
    clientId: BaseValidationSchemas.uuid,
    type: z.enum(['individual', 'group', 'family', 'couples', 'consultation', 'assessment']),
    format: z.enum(['in_person', 'video', 'phone', 'chat']),
    scheduledAt: BaseValidationSchemas.timestamp,
    duration: z.number().int().min(15).max(240), // 15 minutes to 4 hours
    notes: z.string().max(1000).optional()
  }),
  
  updateSession: z.object({
    status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled']).optional(),
    actualStartTime: BaseValidationSchemas.timestamp.optional(),
    actualEndTime: BaseValidationSchemas.timestamp.optional(),
    notes: z.string().max(2000).optional(),
    interventionsUsed: z.array(z.string().min(1).max(100)).optional(),
    homeworkAssigned: z.array(z.string().min(1).max(200)).optional(),
    nextSessionDate: BaseValidationSchemas.timestamp.optional()
  }),
  
  sessionNote: z.object({
    type: z.enum(['soap', 'dap', 'progress', 'treatment', 'crisis', 'supervision']),
    content: z.string().min(1).max(10000),
    isPrivate: z.boolean().default(false),
    section: z.enum(['subjective', 'objective', 'assessment', 'plan']).optional()
  }),
  
  progressNote: z.object({
    goalId: BaseValidationSchemas.uuid.optional(),
    progressRating: z.number().int().min(1).max(10),
    description: z.string().min(1).max(1000),
    interventions: z.array(z.string().min(1).max(100)),
    clientResponse: z.string().min(1).max(1000),
    homeworkCompliance: z.number().int().min(1).max(10).optional(),
    barriers: z.array(z.string().min(1).max(200)).optional(),
    breakthroughs: z.array(z.string().min(1).max(200)).optional(),
    nextSteps: z.array(z.string().min(1).max(200))
  }),
  
  treatmentGoal: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(1000),
    priority: z.enum(['high', 'medium', 'low']),
    targetDate: BaseValidationSchemas.timestamp,
    measurableObjectives: z.array(z.object({
      description: z.string().min(1).max(500),
      measurementCriteria: z.string().min(1).max(200),
      targetBehavior: z.string().min(1).max(200),
      interventions: z.array(z.string().min(1).max(100))
    })).min(1),
    progressMetrics: z.array(z.string().min(1).max(100))
  })
};

// File upload validation schemas
export const FileValidationSchemas = {
  upload: z.object({
    file: z.any().refine(file => file instanceof File, 'Must be a valid file'),
    path: z.string().optional().default('/'),
    encrypted: z.boolean().optional().default(false),
    tags: z.array(z.string().min(1).max(50)).optional().default([])
  }).refine(data => {
    if (!(data.file instanceof File)) return false;
    
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'audio/mpeg', 'audio/wav', 'video/mp4'
    ];
    
    return data.file.size <= maxSize && allowedTypes.includes(data.file.type);
  }, {
    message: 'File must be under 100MB and of an allowed type'
  })
};

// Message validation schemas
export const MessageValidationSchemas = {
  sendMessage: z.object({
    conversationId: BaseValidationSchemas.uuid,
    content: z.string().min(1).max(5000),
    type: z.enum(['text', 'image', 'file', 'voice', 'video']).default('text'),
    replyTo: BaseValidationSchemas.uuid.optional(),
    attachments: z.array(BaseValidationSchemas.uuid).optional(),
    encrypted: z.boolean().optional().default(false)
  }),
  
  createConversation: z.object({
    type: z.enum(['direct', 'group', 'support_session', 'therapy_session', 'crisis_intervention']),
    title: z.string().min(1).max(100).optional(),
    participants: z.array(BaseValidationSchemas.uuid).min(1),
    settings: z.object({
      allowFiles: z.boolean().default(true),
      allowVoice: z.boolean().default(true),
      allowVideo: z.boolean().default(true),
      moderationLevel: z.enum(['none', 'basic', 'strict']).default('basic'),
      safetyMode: z.boolean().default(true),
      endToEndEncrypted: z.boolean().default(false)
    }).optional()
  })
};

// Validation utility functions
export class ValidationService {
  private static formatZodErrors(error: ZodError): ValidationError[] {
    return error.issues.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      value: err.message.includes('Required') ? undefined : (err as any).received
    }));
  }

  static validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult & { data?: T } {
    try {
      const validatedData = schema.parse(data);
      return {
        isValid: true,
        errors: [],
        data: validatedData
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          isValid: false,
          errors: this.formatZodErrors(error)
        };
      }
      
      return {
        isValid: false,
        errors: [{ field: 'unknown', message: 'Validation failed', code: 'VALIDATION_ERROR' }]
      };
    }
  }

  static async validateAsync<T>(schema: ZodSchema<T>, data: unknown): Promise<ValidationResult & { data?: T }> {
    try {
      const validatedData = await schema.parseAsync(data);
      return {
        isValid: true,
        errors: [],
        data: validatedData
      };
    } catch (error) {
      if (error instanceof ZodError) {
        return {
          isValid: false,
          errors: this.formatZodErrors(error)
        };
      }
      
      return {
        isValid: false,
        errors: [{ field: 'unknown', message: 'Validation failed', code: 'VALIDATION_ERROR' }]
      };
    }
  }

  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, ''); // Remove event handlers
  }

  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  static sanitizePhoneNumber(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }

  static validateAndSanitize<T>(
    schema: ZodSchema<T>,
    data: unknown,
    sanitizers?: Record<string, (value: any) => any>
  ): ValidationResult & { data?: T } {
    // Apply sanitizers if provided
    if (sanitizers && typeof data === 'object' && data !== null) {
      const sanitizedData = { ...data as Record<string, any> };
      for (const [field, sanitizer] of Object.entries(sanitizers)) {
        if (field in sanitizedData) {
          sanitizedData[field] = sanitizer(sanitizedData[field]);
        }
      }
      return this.validate(schema, sanitizedData);
    }

    return this.validate(schema, data);
  }

  // Type-specific validators
  static isValidUUID(value: unknown): value is UUID {
    return typeof value === 'string' && isUUID(value);
  }

  static isValidEmail(value: unknown): value is Email {
    return typeof value === 'string' && isEmail(value);
  }

  static isValidTimestamp(value: unknown): value is Date | string {
    if (value instanceof Date) return !isNaN(value.getTime());
    if (typeof value === 'string') {
      const date = new Date(value);
      return !isNaN(date.getTime());
    }
    return false;
  }

  static isValidPhoneNumber(value: unknown): value is PhoneNumber {
    if (typeof value !== 'string') return false;
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(value.replace(/[\s\-\(\)\.]/g, ''));
  }

  // Custom validation rules
  static createPasswordValidator(options: {
    minLength?: number;
    maxLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSpecialChars?: boolean;
    bannedPasswords?: string[];
  } = {}) {
    const {
      minLength = 8,
      maxLength = 128,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
      bannedPasswords = []
    } = options;

    return z.string()
      .min(minLength, `Password must be at least ${minLength} characters`)
      .max(maxLength, `Password must not exceed ${maxLength} characters`)
      .refine(
        (password) => !requireUppercase || /[A-Z]/.test(password),
        'Password must contain at least one uppercase letter'
      )
      .refine(
        (password) => !requireLowercase || /[a-z]/.test(password),
        'Password must contain at least one lowercase letter'
      )
      .refine(
        (password) => !requireNumbers || /[0-9]/.test(password),
        'Password must contain at least one number'
      )
      .refine(
        (password) => !requireSpecialChars || /[^A-Za-z0-9]/.test(password),
        'Password must contain at least one special character'
      )
      .refine(
        (password) => !bannedPasswords.includes(password.toLowerCase()),
        'Password is too common and not allowed'
      );
  }
}

// Export all schemas and utilities
export const Schemas = {
  Base: BaseValidationSchemas,
  User: UserValidationSchemas,
  Auth: AuthValidationSchemas,
  Crisis: CrisisValidationSchemas,
  Therapy: TherapyValidationSchemas,
  File: FileValidationSchemas,
  Message: MessageValidationSchemas
};

export default ValidationService;

// ==================== ENHANCED EXPORTS ====================
// Note: Enhanced exports commented out to resolve import conflicts
// These will be re-enabled once the corresponding files are created

// // Export enhanced validation service and utilities
// export { default as EnhancedValidationService } from './validation-service';
// export type { XSSConfig, SanitizationResult } from './validation-service';

// // Export validation middleware
// export {
//   default as ValidationMiddleware,
//   withValidation,
//   withSanitization,
//   withSecurity,
//   getSanitizedBody,
//   getSecurityContext
// } from './validation-middleware';

// // Export enhanced schemas
// export {
//   SecureSchemas,
//   EnhancedUserSchemas,
//   EnhancedAuthSchemas,
//   EnhancedWellnessSchemas,
//   EnhancedCrisisSchemas,
//   EnhancedCommunitySchemas,
//   EnhancedFileSchemas,
//   EnhancedSearchSchemas,
//   ValidationUtils
// } from './schemas';

// // Export form validation hooks and utilities
// export {
//   useFormValidation,
//   useFieldValidation,
//   formatValidationError,
//   getSecurityLevelColor,
//   createPasswordValidationRule,
//   createEmailUniquenessRule,
//   createMedicalTextRule
// } from './form-validators';

// // Export form validation types
// export type {
//   FormValidationConfig,
//   FieldValidationResult,
//   CustomValidationRule
// } from './form-validators';

// ==================== USAGE EXAMPLES ====================

/**
 * Example: API Route with Enhanced Validation
 * 
 * ```typescript
 * import { withValidation } from '@/lib/validation';
 * import { EnhancedUserSchemas } from '@/lib/validation';
 * 
 * export const POST = withValidation(
 *   EnhancedUserSchemas.registration,
 *   {
 *     sanitizeInputs: true,
 *     logSecurityEvents: true,
 *     blockMaliciousRequests: true,
 *     rateLimit: { requests: 5, window: 15 }
 *   }
 * )(async (request) => {
 *   const sanitizedData = getSanitizedBody(request);
 *   const securityContext = getSecurityContext(request);
 *   
 *   // Handle registration with sanitized data
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */

/**
 * Example: React Form with Enhanced Validation
 * 
 * ```tsx
 * import { useFormValidation, EnhancedAuthSchemas } from '@/lib/validation';
 * 
 * function LoginForm() {
 *   const {
 *     values,
 *     errors,
 *     warnings,
 *     securityIssues,
 *     handleFieldChange,
 *     handleFieldBlur,
 *     handleSubmit,
 *     isSubmitting
 *   } = useFormValidation(EnhancedAuthSchemas.login, {
 *     validateOnChange: true,
 *     sanitizeInputs: true,
 *     showSecurityWarnings: true
 *   });
 * 
 *   const onSubmit = async (data) => {
 *     await fetch('/api/auth/login', {
 *       method: 'POST',
 *       body: JSON.stringify(data)
 *     });
 *   };
 * 
 *   return (
 *     <form onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit); }}>
 *       <input
 *         type="email"
 *         value={values.email || ''}
 *         onChange={(e) => handleFieldChange('email', e.target.value)}
 *         onBlur={() => handleFieldBlur('email')}
 *       />
 *       {errors.email && <span className="error">{errors.email}</span>}
 *       {securityIssues.email && (
 *         <div className="security-warning">
 *           Security concerns: {securityIssues.email.join(', ')}
 *         </div>
 *       )}
 *       <button type="submit" disabled={isSubmitting}>Login</button>
 *     </form>
 *   );
 * }
 * ```
 */

/**
 * Example: Direct Security Validation
 * 
 * ```typescript
 * import { EnhancedValidationService } from '@/lib/validation';
 * 
 * const validator = EnhancedValidationService.getInstance();
 * 
 * // Sanitize user input
 * const userInput = "<script>alert('xss')</script>Hello World!";
 * const result = validator.validateSecurity(userInput, 'html');
 * 
 * console.log(result.sanitized); // "Hello World!"
 * console.log(result.isSecure); // false
 * console.log(result.threats); // ["XSS pattern detected"]
 * console.log(result.level); // "malicious"
 * ```
 */