/**
 * Security Validation Utilities for HIPAA Compliance
 * Validates security configurations and prevents common vulnerabilities
 */

import { HIPAA_ENCRYPTION_CONFIG } from './hipaa-security-config';

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100 security score
}

export class SecurityValidator {
  private static instance: SecurityValidator;
  
  public static getInstance(): SecurityValidator {
    if (!SecurityValidator.instance) {
      SecurityValidator.instance = new SecurityValidator();
    }
    return SecurityValidator.instance;
  }

  /**
   * Validate password strength according to HIPAA requirements
   */
  validatePassword(password: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // Length check
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    } else if (password.length >= 16) {
      score += 25;
    } else {
      score += 15;
    }

    // Character variety checks
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUppercase) errors.push('Password must contain uppercase letters');
    else score += 15;

    if (!hasLowercase) errors.push('Password must contain lowercase letters');
    else score += 15;

    if (!hasNumbers) errors.push('Password must contain numbers');
    else score += 15;

    if (!hasSpecialChars) errors.push('Password must contain special characters');
    else score += 15;

    // Common patterns check
    const commonPatterns = [
      /123/g,
      /abc/gi,
      /password/gi,
      /qwerty/gi,
      /admin/gi,
      /user/gi,
      /(\d)\1{2,}/g, // Repeated digits
      /([a-zA-Z])\1{2,}/gi, // Repeated letters
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(password)) {
        warnings.push('Password contains common patterns - consider making it more complex');
        score -= 5;
        break;
      }
    }

    // Entropy calculation (simplified)
    const uniqueChars = new Set(password.toLowerCase()).size;
    if (uniqueChars < 8) {
      warnings.push('Password has low character diversity');
      score -= 5;
    } else {
      score += 15;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  /**
   * Validate email for security issues
   */
  validateEmail(email: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 50;

    // Basic format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
      return { isValid: false, errors, warnings, score: 0 };
    }

    score += 20;

    // Check for suspicious domains
    const suspiciousDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com',
    ];

    const domain = email.split('@')[1].toLowerCase();
    if (suspiciousDomains.includes(domain)) {
      warnings.push('Temporary email domains may not receive important notifications');
      score -= 10;
    }

    // Check for common professional domains (good for healthcare)
    const professionalDomains = [
      'gmail.com',
      'outlook.com',
      'yahoo.com',
      'hotmail.com',
      'protonmail.com',
    ];

    if (!professionalDomains.includes(domain) && !domain.includes('.edu') && !domain.includes('.org')) {
      score += 10; // Organizational emails often more secure
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, Math.min(100, score)),
    };
  }

  /**
   * Validate user input for potential security threats
   */
  validateUserInput(input: string, fieldName: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 80;

    // XSS prevention
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /eval\(/gi,
      /expression\(/gi,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        errors.push(`${fieldName} contains potentially malicious content`);
        score = 0;
        break;
      }
    }

    // SQL injection prevention
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /('|(\\x27)|(\\x2D\\x2D))/gi,
      /(;|\||`)/g,
      /(\/\*|\*\/)/g,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        errors.push(`${fieldName} contains potentially dangerous SQL characters`);
        score = 0;
        break;
      }
    }

    // Check for excessive length (DoS prevention)
    if (input.length > 10000) {
      errors.push(`${fieldName} exceeds maximum length limit`);
      score -= 20;
    }

    // Check for null bytes
    if (input.includes('\0')) {
      errors.push(`${fieldName} contains null bytes`);
      score = 0;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Validate environment configuration for security
   */
  validateEnvironmentConfig(): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // Check required environment variables
    const requiredVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'ENCRYPTION_KEY',
    ];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        errors.push(`Required environment variable ${varName} is not set`);
      } else {
        score += 20;
      }
    }

    // Validate encryption key strength
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (encryptionKey) {
      if (encryptionKey.length < HIPAA_ENCRYPTION_CONFIG.minKeyLength) {
        errors.push(`ENCRYPTION_KEY must be at least ${HIPAA_ENCRYPTION_CONFIG.minKeyLength} characters`);
      } else {
        score += 20;
      }

      // Check if using default/weak key
      if (encryptionKey.includes('development') || encryptionKey.includes('default')) {
        errors.push('ENCRYPTION_KEY appears to be a default/development key');
      }
    }

    // Validate NextAuth secret
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    if (nextAuthSecret) {
      if (nextAuthSecret.length < 32) {
        errors.push('NEXTAUTH_SECRET must be at least 32 characters');
      } else {
        score += 20;
      }
    }

    // Production environment checks
    if (process.env.NODE_ENV === 'production') {
      if (!process.env.NEXTAUTH_URL?.startsWith('https://')) {
        errors.push('NEXTAUTH_URL must use HTTPS in production');
      } else {
        score += 10;
      }

      // Check debug modes
      if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
        warnings.push('Debug mode should be disabled in production');
        score -= 5;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.min(100, score),
    };
  }

  /**
   * Validate IP address for potential threats
   */
  validateIPAddress(ip: string): SecurityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 70;

    // Check for private/local IPs (not inherently bad, but worth noting)
    const privateIPPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fe80:/,
    ];

    const isPrivateIP = privateIPPatterns.some(pattern => pattern.test(ip));
    if (isPrivateIP) {
      warnings.push('Request from private IP address');
      score += 10; // Private IPs are often safer
    }

    // Check for localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      warnings.push('Request from localhost');
      score += 20; // Localhost is generally safe
    }

    // Basic IP format validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    
    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip) && ip !== 'unknown') {
      warnings.push('Invalid IP address format');
      score -= 10;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }

  /**
   * Comprehensive security assessment
   */
  performSecurityAssessment(): SecurityValidationResult {
    const envValidation = this.validateEnvironmentConfig();
    
    const errors: string[] = [...envValidation.errors];
    const warnings: string[] = [...envValidation.warnings];
    const score = envValidation.score;

    // Additional checks can be added here
    // Database connection security, SSL certificates, etc.

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
    };
  }
}

// Export singleton
export const securityValidator = SecurityValidator.getInstance();

// Utility functions
export function sanitizeInput(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

export function isSecureContext(request: Request): boolean {
  const origin = request.headers.get('origin');
  const protocol = new URL(request.url).protocol;
  
  return (
    protocol === 'https:' ||
    origin?.includes('localhost') ||
    origin?.includes('127.0.0.1') ||
    process.env.NODE_ENV === 'development'
  );
}

export default securityValidator;