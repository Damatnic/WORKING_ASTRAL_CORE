/**
 * Comprehensive Validation Service for AstralCore Mental Health Platform
 * 
 * This service provides enterprise-grade input validation and sanitization with:
 * - XSS Prevention using DOMPurify concepts
 * - SQL Injection Prevention
 * - Path Traversal Prevention
 * - Command Injection Prevention
 * - LDAP Injection Prevention
 * - HIPAA-compliant security measures
 * 
 * @author AstralCore Development Team
 * @version 1.0.0
 */

import { z } from 'zod';

// XSS Prevention Configuration
interface XSSConfig {
  allowedTags: string[];
  allowedAttributes: Record<string, string[]>;
  allowedProtocols: string[];
  maxLength: number;
  stripInvalidTags: boolean;
}

// Default XSS configuration for mental health platform
const DEFAULT_XSS_CONFIG: XSSConfig = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li'],
  allowedAttributes: {
    '*': ['class'],
    'a': ['href', 'title'],
    'img': ['src', 'alt', 'width', 'height']
  },
  allowedProtocols: ['http', 'https', 'mailto'],
  maxLength: 10000,
  stripInvalidTags: true
};

// Security patterns for various injection attacks
const SECURITY_PATTERNS = {
  // XSS patterns
  XSS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /livescript:/gi,
    /mocha:/gi,
    /data:text\/html/gi
  ],
  
  // SQL Injection patterns
  SQL: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+(ALL\s+)?SELECT)/gi,
    /(\b(OR|AND)\b\s*\d+\s*=\s*\d+)/gi,
    /('|(\\x27)|(\\x2D\\x2D)|(%27)|(%2D%2D))/gi,
    /(;|\x00)/g,
    /(\b(sp_|xp_|cmdshell)\b)/gi
  ],
  
  // Path Traversal patterns
  PATH_TRAVERSAL: [
    /\.\.\//g,
    /\.\.\\/g,
    /%2e%2e%2f/gi,
    /%2e%2e%5c/gi,
    /\.\.%2f/gi,
    /\.\.%5c/gi,
    /%252e%252e%252f/gi,
    /\.\./g
  ],
  
  // Command Injection patterns
  COMMAND: [
    /[;&|`$()]/g,
    /\b(cat|ls|pwd|id|whoami|uname|ps|netstat|ifconfig|ping|wget|curl|nc|telnet|ssh|ftp|tftp|nslookup|dig|host|mount|umount|su|sudo|chmod|chown|kill|killall|rm|rmdir|cp|mv|ln|find|locate|which|whereis|file|strings|od|hexdump|xxd|base64|openssl|gpg|tar|gzip|gunzip|zip|unzip|7z|rar|unrar)\b/gi,
    /(\||&|;|\$\(|\$\{|`)/g
  ],
  
  // LDAP Injection patterns
  LDAP: [
    /[()&|!*]/g,
    /(\\x[0-9a-fA-F]{2})/g,
    /(\x00|\x01|\x02|\x03|\x04|\x05|\x06|\x07|\x08|\x09|\x0a|\x0b|\x0c|\x0d|\x0e|\x0f)/g
  ],
  
  // NoSQL Injection patterns
  NOSQL: [
    /(\$where|\$ne|\$in|\$nin|\$gt|\$gte|\$lt|\$lte|\$exists|\$regex|\$or|\$and|\$not|\$nor|\$all|\$size|\$type|\$mod|\$elemMatch)/gi,
    /(this\.|db\.|function\s*\()/gi
  ]
};

// Sanitization results interface
interface SanitizationResult {
  sanitized: string;
  modified: boolean;
  removedPatterns: string[];
  securityLevel: 'clean' | 'suspicious' | 'malicious';
}

export class ValidationService {
  private static instance: ValidationService;
  private xssConfig: XSSConfig;
  
  constructor(config: Partial<XSSConfig> = {}) {
    this.xssConfig = { ...DEFAULT_XSS_CONFIG, ...config };
  }
  
  /**
   * Get singleton instance of ValidationService
   */
  static getInstance(config?: Partial<XSSConfig>): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService(config);
    }
    return ValidationService.instance;
  }
  
  // ==================== INPUT SANITIZATION ====================
  
  /**
   * Comprehensive text sanitization with XSS prevention
   * Removes malicious scripts while preserving safe content
   */
  sanitizeText(input: string, options: Partial<XSSConfig> = {}): SanitizationResult {
    if (typeof input !== 'string') {
      return {
        sanitized: '',
        modified: true,
        removedPatterns: ['Invalid input type'],
        securityLevel: 'suspicious'
      };
    }
    
    const config = { ...this.xssConfig, ...options };
    let sanitized = input;
    let modified = false;
    const removedPatterns: string[] = [];
    let securityLevel: 'clean' | 'suspicious' | 'malicious' = 'clean';
    
    // Trim whitespace and check length
    sanitized = sanitized.trim();
    if (sanitized.length > config.maxLength) {
      sanitized = sanitized.substring(0, config.maxLength);
      modified = true;
      removedPatterns.push('Length exceeded');
    }
    
    // Check for XSS patterns
    for (const pattern of SECURITY_PATTERNS.XSS) {
      if (pattern.test(sanitized)) {
        sanitized = sanitized.replace(pattern, '');
        modified = true;
        removedPatterns.push('XSS pattern detected');
        securityLevel = 'malicious';
      }
    }
    
    // HTML tag sanitization
    if (config.stripInvalidTags) {
      const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
      sanitized = sanitized.replace(tagPattern, (match, tagName) => {
        if (!config.allowedTags.includes(tagName.toLowerCase())) {
          modified = true;
          removedPatterns.push(`Unsafe tag: ${tagName}`);
          securityLevel = securityLevel === 'clean' ? 'suspicious' : securityLevel;
          return '';
        }
        return match;
      });
    }
    
    // Encode special characters to prevent XSS
    sanitized = this.encodeHtmlEntities(sanitized);
    
    return {
      sanitized,
      modified,
      removedPatterns,
      securityLevel
    };
  }
  
  /**
   * Sanitize HTML content with whitelist approach
   */
  sanitizeHTML(input: string, allowedTags: string[] = []): string {
    if (typeof input !== 'string') return '';
    
    const tags = allowedTags.length > 0 ? allowedTags : this.xssConfig.allowedTags;
    
    // Remove all script content completely
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove dangerous attributes
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/javascript\s*:/gi, '');
    sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '');
    
    // Keep only allowed tags
    const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
    sanitized = sanitized.replace(tagPattern, (match, tagName) => {
      return tags.includes(tagName.toLowerCase()) ? match : '';
    });
    
    return sanitized;
  }
  
  /**
   * Sanitize email addresses
   */
  sanitizeEmail(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w@.-]/g, '') // Keep only alphanumeric, @, ., and -
      .substring(0, 254); // RFC 5321 limit
  }
  
  /**
   * Sanitize phone numbers
   */
  sanitizePhoneNumber(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/[^\d+\-\(\)\s\.]/g, '') // Keep only digits, +, -, (), spaces, and dots
      .trim()
      .substring(0, 20); // Reasonable phone number length
  }
  
  /**
   * Sanitize URLs with protocol validation
   */
  sanitizeURL(input: string, allowedProtocols: string[] = ['http', 'https']): string {
    if (typeof input !== 'string') return '';
    
    try {
      const url = new URL(input);
      
      // Check if protocol is allowed
      if (!allowedProtocols.includes(url.protocol.replace(':', ''))) {
        return '';
      }
      
      // Remove dangerous protocols
      if (['javascript', 'data', 'vbscript', 'file'].includes(url.protocol.replace(':', ''))) {
        return '';
      }
      
      return url.toString();
    } catch {
      return '';
    }
  }
  
  /**
   * Sanitize file paths to prevent directory traversal
   */
  sanitizeFilePath(input: string): string {
    if (typeof input !== 'string') return '';
    
    let sanitized = input;
    
    // Remove path traversal patterns
    for (const pattern of SECURITY_PATTERNS.PATH_TRAVERSAL) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    // Remove null bytes and other control characters
    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');
    
    // Normalize path separators and remove leading slashes
    sanitized = sanitized.replace(/[\\\/]+/g, '/').replace(/^\/+/, '');
    
    return sanitized.substring(0, 255); // Reasonable path length limit
  }
  
  // ==================== INJECTION PREVENTION ====================
  
  /**
   * Check for SQL injection patterns
   */
  detectSQLInjection(input: string): { isSafe: boolean; threats: string[] } {
    if (typeof input !== 'string') return { isSafe: false, threats: ['Invalid input type'] };
    
    const threats: string[] = [];
    
    for (const pattern of SECURITY_PATTERNS.SQL) {
      if (pattern.test(input)) {
        threats.push('SQL injection pattern detected');
      }
    }
    
    return {
      isSafe: threats.length === 0,
      threats
    };
  }
  
  /**
   * Sanitize database query parameters
   */
  sanitizeQueryParam(input: string): string {
    if (typeof input !== 'string') return '';
    
    // Remove SQL injection patterns
    let sanitized = input;
    for (const pattern of SECURITY_PATTERNS.SQL) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    // Remove NoSQL injection patterns
    for (const pattern of SECURITY_PATTERNS.NOSQL) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    return sanitized.trim();
  }
  
  /**
   * Check for command injection patterns
   */
  detectCommandInjection(input: string): { isSafe: boolean; threats: string[] } {
    if (typeof input !== 'string') return { isSafe: false, threats: ['Invalid input type'] };
    
    const threats: string[] = [];
    
    for (const pattern of SECURITY_PATTERNS.COMMAND) {
      if (pattern.test(input)) {
        threats.push('Command injection pattern detected');
      }
    }
    
    return {
      isSafe: threats.length === 0,
      threats
    };
  }
  
  /**
   * Check for LDAP injection patterns
   */
  detectLDAPInjection(input: string): { isSafe: boolean; threats: string[] } {
    if (typeof input !== 'string') return { isSafe: false, threats: ['Invalid input type'] };
    
    const threats: string[] = [];
    
    for (const pattern of SECURITY_PATTERNS.LDAP) {
      if (pattern.test(input)) {
        threats.push('LDAP injection pattern detected');
      }
    }
    
    return {
      isSafe: threats.length === 0,
      threats
    };
  }
  
  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Encode HTML entities to prevent XSS
   */
  private encodeHtmlEntities(input: string): string {
    const entityMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    };
    
    return input.replace(/[&<>"'`=\/]/g, (char) => entityMap[char]);
  }
  
  /**
   * Decode HTML entities safely
   */
  decodeHtmlEntities(input: string): string {
    if (typeof input !== 'string') return '';
    
    const entityMap: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#x27;': "'",
      '&#x2F;': '/',
      '&#x60;': '`',
      '&#x3D;': '='
    };
    
    return input.replace(/&(amp|lt|gt|quot|#x27|#x2F|#x60|#x3D);/g, (entity) => entityMap[entity] || entity);
  }
  
  /**
   * Validate content length with HIPAA considerations
   * Does not log actual content for privacy compliance
   */
  validateLength(input: string, maxLength: number, fieldName: string = 'field'): { isValid: boolean; message?: string } {
    if (typeof input !== 'string') {
      return { isValid: false, message: `${fieldName} must be a string` };
    }
    
    if (input.length > maxLength) {
      // HIPAA compliant: Don't log the actual content
      return { 
        isValid: false, 
        message: `${fieldName} exceeds maximum length of ${maxLength} characters` 
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Check if input contains only safe characters for medical data
   */
  validateMedicalText(input: string): { isValid: boolean; message?: string } {
    if (typeof input !== 'string') {
      return { isValid: false, message: 'Input must be a string' };
    }
    
    // Allow letters, numbers, spaces, basic punctuation
    const safePattern = /^[a-zA-Z0-9\s\.,\-\(\)\[\]\/\\\:;'"!?\n\r]*$/;
    
    if (!safePattern.test(input)) {
      return { 
        isValid: false, 
        message: 'Text contains invalid characters for medical documentation' 
      };
    }
    
    return { isValid: true };
  }
  
  /**
   * Comprehensive security validation combining all checks
   */
  validateSecurity(input: string, type: 'text' | 'html' | 'url' | 'email' | 'phone' | 'filepath' = 'text'): {
    isSecure: boolean;
    sanitized: string;
    threats: string[];
    level: 'clean' | 'suspicious' | 'malicious';
  } {
    if (typeof input !== 'string') {
      return {
        isSecure: false,
        sanitized: '',
        threats: ['Invalid input type'],
        level: 'malicious'
      };
    }
    
    const allThreats: string[] = [];
    let sanitized = input;
    let level: 'clean' | 'suspicious' | 'malicious' = 'clean';
    
    // Type-specific sanitization
    switch (type) {
      case 'html':
        const htmlResult = this.sanitizeText(input);
        sanitized = htmlResult.sanitized;
        if (htmlResult.securityLevel !== 'clean') {
          level = htmlResult.securityLevel;
          allThreats.push(...htmlResult.removedPatterns);
        }
        break;
      
      case 'url':
        sanitized = this.sanitizeURL(input);
        if (sanitized !== input && sanitized === '') {
          level = 'malicious';
          allThreats.push('Invalid or dangerous URL');
        }
        break;
      
      case 'email':
        sanitized = this.sanitizeEmail(input);
        if (sanitized !== input.toLowerCase().trim()) {
          level = 'suspicious';
          allThreats.push('Email contained invalid characters');
        }
        break;
      
      case 'phone':
        sanitized = this.sanitizePhoneNumber(input);
        break;
      
      case 'filepath':
        sanitized = this.sanitizeFilePath(input);
        if (sanitized !== input) {
          level = 'malicious';
          allThreats.push('Path traversal attempt detected');
        }
        break;
      
      default:
        const textResult = this.sanitizeText(input);
        sanitized = textResult.sanitized;
        if (textResult.securityLevel !== 'clean') {
          level = textResult.securityLevel;
          allThreats.push(...textResult.removedPatterns);
        }
    }
    
    // Additional security checks
    const sqlCheck = this.detectSQLInjection(sanitized);
    if (!sqlCheck.isSafe) {
      level = 'malicious';
      allThreats.push(...sqlCheck.threats);
    }
    
    const cmdCheck = this.detectCommandInjection(sanitized);
    if (!cmdCheck.isSafe) {
      level = 'malicious';
      allThreats.push(...cmdCheck.threats);
    }
    
    const ldapCheck = this.detectLDAPInjection(sanitized);
    if (!ldapCheck.isSafe) {
      level = 'malicious';
      allThreats.push(...ldapCheck.threats);
    }
    
    return {
      isSecure: level === 'clean',
      sanitized,
      threats: allThreats,
      level
    };
  }
  
  /**
   * Batch sanitization for multiple inputs
   * HIPAA compliant: Does not log input values
   */
  sanitizeBatch(inputs: Record<string, any>, types: Record<string, 'text' | 'html' | 'url' | 'email' | 'phone' | 'filepath'> = {}): {
    sanitized: Record<string, any>;
    hasThreats: boolean;
    threatCount: number;
  } {
    const sanitized: Record<string, any> = {};
    let threatCount = 0;
    
    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === 'string') {
        const type = types[key] || 'text';
        const result = this.validateSecurity(value, type);
        sanitized[key] = result.sanitized;
        if (!result.isSecure) {
          threatCount++;
        }
      } else {
        sanitized[key] = value;
      }
    }
    
    return {
      sanitized,
      hasThreats: threatCount > 0,
      threatCount
    };
  }
}

// Export default instance
export default ValidationService.getInstance();

// Export types for external use
export type {
  XSSConfig,
  SanitizationResult
};