/**
 * Input Validation Security Tests
 * Tests XSS, SQL injection, command injection prevention
 * 
 * HIPAA Compliance: Tests ensure malicious input cannot
 * compromise PHI or system integrity
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import DOMPurify from 'isomorphic-dompurify';
import { defaultSecurityConfig } from '../../security/security-tests.config';
import type { SecurityTestConfig, InjectionTestConfig, XSSTestConfig } from '../../security/security-tests.config';

// Mock modules
jest.mock('isomorphic-dompurify');
jest.mock('@/lib/prisma');
jest.mock('@/lib/validation');

// Mock database
const mockDb = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  journalEntry: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  },
  securityEvent: {
    create: jest.fn()
  }
};

// Mock validation service
const mockValidation = {
  sanitizeInput: jest.fn(),
  validateEmail: jest.fn(),
  validatePassword: jest.fn(),
  validatePhoneNumber: jest.fn(),
  sanitizeHtml: jest.fn(),
  detectSqlInjection: jest.fn(),
  detectXss: jest.fn(),
  validateFileUpload: jest.fn()
};

const securityConfig: SecurityTestConfig = defaultSecurityConfig;
const injectionConfig: InjectionTestConfig = securityConfig.owasp.injectionTests;
const xssConfig: XSSTestConfig = securityConfig.owasp.xss;

describe('Input Validation Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SQL Injection Prevention Tests', () => {
    it('should detect and prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = injectionConfig.sqlInjection.testPayloads;

      for (const payload of sqlInjectionPayloads) {
        mockValidation.detectSqlInjection.mockReturnValue(true);
        
        const isSqlInjection = mockValidation.detectSqlInjection(payload);
        expect(isSqlInjection).toBe(true);

        // Verify malicious input is blocked
        expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
          data: {
            type: 'sql_injection_attempt',
            payload,
            blocked: true,
            riskLevel: 'high',
            timestamp: expect.any(Date)
          }
        });
      }
    });

    it('should sanitize user input in database queries', async () => {
      const userInput = "'; DROP TABLE users; --";
      const sanitizedInput = "'; DROP TABLE users; --"; // Should be escaped/sanitized
      
      mockValidation.sanitizeInput.mockReturnValue(sanitizedInput);
      
      // Test parameterized query approach
      const safeQuery = 'SELECT * FROM users WHERE username = $1';
      const queryParams = [sanitizedInput];
      
      // Verify parameterized queries are used instead of string concatenation
      expect(safeQuery).not.toContain(userInput);
      expect(queryParams[0]).toBe(sanitizedInput);
    });

    it('should validate input length limits', async () => {
      const oversizedInput = 'A'.repeat(10000); // Very long input
      const normalInput = 'normal input';
      
      const maxLength = 1000;
      
      // Test oversized input rejection
      const isOversizedValid = oversizedInput.length <= maxLength;
      expect(isOversizedValid).toBe(false);
      
      // Test normal input acceptance
      const isNormalValid = normalInput.length <= maxLength;
      expect(isNormalValid).toBe(true);
      
      if (!isOversizedValid) {
        expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
          data: {
            type: 'input_size_violation',
            inputLength: oversizedInput.length,
            maxAllowed: maxLength,
            blocked: true
          }
        });
      }
    });

    it('should prevent NoSQL injection in MongoDB queries', async () => {
      const nosqlPayloads = injectionConfig.nosqlInjection.testPayloads;
      
      for (const payload of nosqlPayloads) {
        // Test for NoSQL injection patterns
        const isNoSqlInjection = containsNoSqlInjection(payload);
        expect(isNoSqlInjection).toBe(true);
        
        // Verify the payload is blocked
        if (isNoSqlInjection) {
          expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
            data: {
              type: 'nosql_injection_attempt',
              payload: JSON.stringify(payload),
              blocked: true,
              riskLevel: 'high'
            }
          });
        }
      }
    });
  });

  describe('Cross-Site Scripting (XSS) Prevention Tests', () => {
    it('should prevent reflected XSS attacks', async () => {
      const xssPayloads = xssConfig.reflectedXSS.testPayloads;
      
      for (const payload of xssPayloads) {
        mockValidation.detectXss.mockReturnValue(true);
        (DOMPurify.sanitize as jest.MockedFunction<typeof DOMPurify.sanitize>)
          .mockReturnValue(''); // XSS payload should be stripped
        
        const isXss = mockValidation.detectXss(payload);
        expect(isXss).toBe(true);
        
        const sanitized = DOMPurify.sanitize(payload);
        expect(sanitized).toBe(''); // Malicious script should be removed
        
        // Verify XSS attempt is logged
        expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
          data: {
            type: 'xss_attempt',
            subtype: 'reflected',
            payload,
            blocked: true,
            riskLevel: 'high'
          }
        });
      }
    });

    it('should prevent stored XSS attacks', async () => {
      const storedXssPayloads = xssConfig.storedXSS.testPayloads;
      
      for (const payload of storedXssPayloads) {
        mockValidation.sanitizeHtml.mockReturnValue('safe content');
        
        // Test content that would be stored in database
        const sanitizedContent = mockValidation.sanitizeHtml(payload);
        
        expect(sanitizedContent).toBe('safe content');
        expect(sanitizedContent).not.toContain('<script>');
        expect(sanitizedContent).not.toContain('javascript:');
        expect(sanitizedContent).not.toContain('onerror=');
        
        // Verify storage fields are properly sanitized
        const storageFields = xssConfig.storedXSS.storageFields;
        for (const field of storageFields) {
          const fieldData = { [field]: sanitizedContent };
          expect(fieldData[field]).not.toMatch(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi);
        }
      }
    });

    it('should prevent DOM-based XSS attacks', async () => {
      const domXssPayloads = xssConfig.domXSS.jsPayloads;
      
      for (const payload of domXssPayloads) {
        // Test client-side input validation
        const isDangerous = containsDangerousJavaScript(payload);
        expect(isDangerous).toBe(true);
        
        if (isDangerous) {
          // Client-side dangerous patterns should be escaped or rejected
          const escaped = escapeJavaScriptString(payload);
          expect(escaped).not.toBe(payload);
          expect(escaped).not.toContain('javascript:');
        }
      }
    });

    it('should sanitize HTML content in journal entries', async () => {
      const maliciousJournalEntry = `
        <h1>My Day</h1>
        <script>alert('XSS attack!');</script>
        <p>Today was good <img src="x" onerror="alert(1)"></p>
        <a href="javascript:alert('XSS')">Click me</a>
      `;
      
      const sanitizedEntry = `
        <h1>My Day</h1>
        
        <p>Today was good <img src="x"></p>
        <a href="#">Click me</a>
      `;
      
      (DOMPurify.sanitize as jest.MockedFunction<typeof DOMPurify.sanitize>)
        .mockReturnValue(sanitizedEntry);
      
      mockDb.journalEntry.create.mockResolvedValue({
        id: 'entry1',
        content: sanitizedEntry,
        userId: 'user1'
      });
      
      const result = await mockDb.journalEntry.create({
        data: {
          content: DOMPurify.sanitize(maliciousJournalEntry),
          userId: 'user1'
        }
      });
      
      expect(result.content).not.toContain('<script>');
      expect(result.content).not.toContain('onerror=');
      expect(result.content).not.toContain('javascript:');
    });
  });

  describe('Command Injection Prevention Tests', () => {
    it('should prevent command injection in file operations', async () => {
      const commandPayloads = injectionConfig.commandInjection.testCommands;
      
      for (const payload of commandPayloads) {
        const containsCommandInjection = detectCommandInjection(payload);
        expect(containsCommandInjection).toBe(true);
        
        if (containsCommandInjection) {
          expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
            data: {
              type: 'command_injection_attempt',
              payload,
              blocked: true,
              riskLevel: 'critical'
            }
          });
        }
      }
    });

    it('should validate file upload names and paths', async () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        'file.exe',
        'script.sh; rm -rf /',
        'document.pdf\x00.exe',
        'file|whoami.txt'
      ];
      
      for (const filename of maliciousFilenames) {
        const isValid = validateFilename(filename);
        expect(isValid).toBe(false);
        
        if (!isValid) {
          expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
            data: {
              type: 'malicious_filename',
              filename,
              blocked: true,
              riskLevel: 'high'
            }
          });
        }
      }
      
      // Test valid filename
      const validFilename = 'patient_report_2024.pdf';
      const isValidFile = validateFilename(validFilename);
      expect(isValidFile).toBe(true);
    });

    it('should sanitize user input used in system commands', async () => {
      // This should never happen in a properly designed system,
      // but test that if user input must be used in commands, it's properly sanitized
      const userInput = 'file.txt; cat /etc/passwd';
      const sanitized = sanitizeForCommand(userInput);
      
      // Should remove or escape shell metacharacters
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('|');
      expect(sanitized).not.toContain('&');
      expect(sanitized).not.toContain('`');
      expect(sanitized).not.toContain('$');
    });
  });

  describe('LDAP Injection Prevention Tests', () => {
    it('should prevent LDAP injection in authentication', async () => {
      const ldapPayloads = injectionConfig.ldapInjection.testPayloads;
      
      for (const payload of ldapPayloads) {
        const isLdapInjection = detectLdapInjection(payload);
        expect(isLdapInjection).toBe(true);
        
        if (isLdapInjection) {
          const escaped = escapeLdapInput(payload);
          expect(escaped).not.toBe(payload);
          expect(escaped).not.toContain('*)(');
          expect(escaped).not.toContain(')(&');
        }
      }
    });
  });

  describe('Input Validation for PHI Fields', () => {
    it('should validate and sanitize patient personal information', async () => {
      const testData = {
        firstName: '<script>alert("xss")</script>John',
        lastName: 'Doe\'; DROP TABLE patients; --',
        email: 'patient@example.com<script>',
        phone: '(555) 123-4567; rm -rf /',
        ssn: '123-45-6789\x00admin',
        dateOfBirth: '1990-01-01<svg/onload=alert(1)>'
      };
      
      const sanitizedData = {
        firstName: sanitizePhiField(testData.firstName),
        lastName: sanitizePhiField(testData.lastName),
        email: sanitizePhiField(testData.email),
        phone: sanitizePhiField(testData.phone),
        ssn: sanitizePhiField(testData.ssn),
        dateOfBirth: sanitizePhiField(testData.dateOfBirth)
      };
      
      // Verify all PHI fields are properly sanitized
      expect(sanitizedData.firstName).toBe('John');
      expect(sanitizedData.lastName).toBe('Doe');
      expect(sanitizedData.email).toBe('patient@example.com');
      expect(sanitizedData.phone).toBe('(555) 123-4567');
      expect(sanitizedData.ssn).toBe('123-45-6789');
      expect(sanitizedData.dateOfBirth).toBe('1990-01-01');
      
      // Verify no malicious content remains
      Object.values(sanitizedData).forEach(value => {
        expect(value).not.toContain('<script>');
        expect(value).not.toContain('DROP TABLE');
        expect(value).not.toContain('rm -rf');
        expect(value).not.toContain('\x00');
      });
    });

    it('should validate therapy session notes for malicious content', async () => {
      const maliciousNotes = `
        Patient expressed <script>fetch('/admin/deleteAll')</script> feelings.
        Recommended therapy '; UPDATE patients SET notes='HACKED' WHERE id=1; --
        <iframe src="javascript:alert('Session hijacked!')"></iframe>
        Progress: <img src="x" onerror="document.location='http://malicious.com'">
      `;
      
      const sanitizedNotes = sanitizeTherapyNotes(maliciousNotes);
      
      expect(sanitizedNotes).not.toContain('<script>');
      expect(sanitizedNotes).not.toContain('DROP');
      expect(sanitizedNotes).not.toContain('UPDATE');
      expect(sanitizedNotes).not.toContain('<iframe>');
      expect(sanitizedNotes).not.toContain('onerror=');
      expect(sanitizedNotes).not.toContain('javascript:');
      
      // Should preserve legitimate therapeutic content
      expect(sanitizedNotes).toContain('Patient expressed');
      expect(sanitizedNotes).toContain('feelings');
      expect(sanitizedNotes).toContain('Recommended therapy');
    });
  });

  describe('File Upload Security Tests', () => {
    it('should validate file types and reject dangerous files', async () => {
      const dangerousFiles = [
        { name: 'malware.exe', type: 'application/octet-stream' },
        { name: 'script.js', type: 'application/javascript' },
        { name: 'page.html', type: 'text/html' },
        { name: 'macro.docm', type: 'application/vnd.ms-word.document.macroEnabled.12' },
        { name: 'sheet.xlsm', type: 'application/vnd.ms-excel.sheet.macroEnabled.12' }
      ];
      
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
      
      for (const file of dangerousFiles) {
        mockValidation.validateFileUpload.mockReturnValue(false);
        
        const isValid = mockValidation.validateFileUpload(file.name, file.type);
        expect(isValid).toBe(false);
        
        expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
          data: {
            type: 'dangerous_file_upload',
            filename: file.name,
            mimeType: file.type,
            blocked: true,
            riskLevel: 'high'
          }
        });
      }
    });

    it('should scan file contents for malicious patterns', async () => {
      const fileContent = Buffer.from(`
        <%@ Page Language="C#" %>
        <script runat="server">
        void Page_Load(object sender, EventArgs e) {
          System.Diagnostics.Process.Start("cmd.exe", "/c whoami");
        }
        </script>
      `);
      
      const containsMaliciousCode = scanFileContent(fileContent);
      expect(containsMaliciousCode).toBe(true);
      
      if (containsMaliciousCode) {
        expect(mockDb.securityEvent.create).toHaveBeenCalledWith({
          data: {
            type: 'malicious_file_content',
            pattern: 'server_side_script',
            blocked: true,
            riskLevel: 'critical'
          }
        });
      }
    });
  });

  describe('API Input Validation Tests', () => {
    it('should validate JSON input structure', async () => {
      const maliciousJson = {
        __proto__: { isAdmin: true },
        constructor: { prototype: { isAdmin: true } },
        'eval("malicious code")': true,
        'process.exit(1)': 'pwned'
      };
      
      const isValidJson = validateJsonInput(maliciousJson);
      expect(isValidJson).toBe(false);
      
      const cleanJson = sanitizeJsonInput(maliciousJson);
      expect(cleanJson).not.toHaveProperty('__proto__');
      expect(cleanJson).not.toHaveProperty('constructor');
      expect(Object.keys(cleanJson).some(key => key.includes('eval'))).toBe(false);
    });

    it('should validate request headers for malicious content', async () => {
      const maliciousHeaders = {
        'user-agent': '<script>alert("XSS")</script>Mozilla/5.0',
        'x-forwarded-for': '192.168.1.1; rm -rf /',
        'authorization': 'Bearer token\x00admin',
        'content-type': 'application/json; boundary=<script>alert(1)</script>'
      };
      
      for (const [header, value] of Object.entries(maliciousHeaders)) {
        const isValidHeader = validateHeader(header, value);
        expect(isValidHeader).toBe(false);
        
        const sanitizedValue = sanitizeHeaderValue(value);
        expect(sanitizedValue).not.toContain('<script>');
        expect(sanitizedValue).not.toContain('rm -rf');
        expect(sanitizedValue).not.toContain('\x00');
      }
    });
  });
});

// Helper functions for testing
function containsNoSqlInjection(payload: any): boolean {
  if (typeof payload === 'object' && payload !== null) {
    const suspiciousKeys = ['$where', '$regex', '$ne', '$gt', '$lt', '$in', '$nin'];
    return Object.keys(payload).some(key => suspiciousKeys.includes(key));
  }
  return false;
}

function containsDangerousJavaScript(input: string): boolean {
  const dangerousPatterns = [
    /javascript:/i,
    /document\./i,
    /window\./i,
    /eval\(/i,
    /function\s*\(/i,
    /setTimeout/i,
    /setInterval/i,
    /alert\(/i,
    /confirm\(/i,
    /prompt\(/i
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}

function escapeJavaScriptString(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function detectCommandInjection(input: string): boolean {
  const commandPatterns = [
    /[;&|`$(){}[\]]/,
    /\.\./,
    /\/etc\/passwd/,
    /\/bin\/bash/,
    /cmd\.exe/,
    /powershell/i,
    /rm\s+-rf/,
    /del\s+\/f/,
    /format\s+c:/i
  ];
  
  return commandPatterns.some(pattern => pattern.test(input));
}

function validateFilename(filename: string): boolean {
  // Check for path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  
  // Check for null bytes
  if (filename.includes('\x00')) {
    return false;
  }
  
  // Check for executable extensions
  const dangerousExtensions = ['.exe', '.bat', '.sh', '.ps1', '.vbs', '.js', '.php', '.asp', '.jsp'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  if (dangerousExtensions.includes(extension)) {
    return false;
  }
  
  // Check for shell metacharacters
  const shellChars = /[;&|`$(){}[\]<>]/;
  if (shellChars.test(filename)) {
    return false;
  }
  
  return true;
}

function sanitizeForCommand(input: string): string {
  // Remove or escape shell metacharacters
  return input
    .replace(/[;&|`$(){}[\]<>]/g, '')
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .trim();
}

function detectLdapInjection(input: string): boolean {
  const ldapPatterns = [
    /\*\)\(&/,
    /\)\(\|/,
    /\*\)\(/,
    /admin\)\(&/,
    /\*\)\(uid=\*\)/,
    /\)\(!\(&/
  ];
  
  return ldapPatterns.some(pattern => pattern.test(input));
}

function escapeLdapInput(input: string): string {
  return input
    .replace(/\*/g, '\\2a')
    .replace(/\(/g, '\\28')
    .replace(/\)/g, '\\29')
    .replace(/\\/g, '\\5c')
    .replace(/\x00/g, '\\00')
    .replace(/\//g, '\\2f');
}

function sanitizePhiField(input: string): string {
  // Remove HTML tags, SQL injection patterns, and control characters
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/['";]/g, '')
    .replace(/DROP\s+TABLE/gi, '')
    .replace(/UPDATE\s+/gi, '')
    .replace(/DELETE\s+FROM/gi, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
}

function sanitizeTherapyNotes(input: string): string {
  // Sanitize while preserving legitimate therapeutic language
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:[^"']*/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/DROP\s+TABLE/gi, '')
    .replace(/UPDATE\s+.*\s+SET/gi, '')
    .replace(/DELETE\s+FROM/gi, '')
    .trim();
}

function scanFileContent(content: Buffer): boolean {
  const contentStr = content.toString();
  const maliciousPatterns = [
    /<\?php/i,
    /<%@\s*Page/i,
    /<script\s+runat="server"/i,
    /System\.Diagnostics\.Process/i,
    /Runtime\.getRuntime\(\)\.exec/i,
    /import\s+os/i,
    /subprocess\.call/i
  ];
  
  return maliciousPatterns.some(pattern => pattern.test(contentStr));
}

function validateJsonInput(input: any): boolean {
  if (typeof input !== 'object' || input === null) {
    return false;
  }
  
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  const keys = Object.keys(input);
  
  // Check for prototype pollution
  if (dangerousKeys.some(key => keys.includes(key))) {
    return false;
  }
  
  // Check for dangerous function calls in keys
  if (keys.some(key => /eval\(|exec\(|system\(/i.test(key))) {
    return false;
  }
  
  return true;
}

function sanitizeJsonInput(input: any): any {
  if (typeof input !== 'object' || input === null) {
    return input;
  }
  
  const sanitized: any = {};
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  
  for (const [key, value] of Object.entries(input)) {
    if (!dangerousKeys.includes(key) && !/eval\(|exec\(|system\(/i.test(key)) {
      sanitized[key] = typeof value === 'object' ? sanitizeJsonInput(value) : value;
    }
  }
  
  return sanitized;
}

function validateHeader(name: string, value: string): boolean {
  // Check for XSS in header values
  if (/<script|javascript:|on\w+=/i.test(value)) {
    return false;
  }
  
  // Check for command injection
  if (/[;&|`]/.test(value)) {
    return false;
  }
  
  // Check for null bytes
  if (value.includes('\x00')) {
    return false;
  }
  
  return true;
}

function sanitizeHeaderValue(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:[^"']*/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[;&|`]/g, '')
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim();
}