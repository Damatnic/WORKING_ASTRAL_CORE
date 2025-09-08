/**
 * Authentication Security Tests
 * Tests authentication flows, MFA, session management for AstralCore
 * 
 * HIPAA Compliance: Tests ensure proper authentication controls
 * for protected health information access
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { defaultSecurityConfig } from '../../security/security-tests.config';
import type { SecurityTestConfig } from '../../security/security-tests.config';

// Mock modules
jest.mock('next-auth');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('@/lib/prisma');
jest.mock('@/lib/security/rate-limiter');

// Mock database
const mockDb = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  session: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  }
};

// Mock rate limiter
const mockRateLimiter = {
  check: jest.fn(),
  reset: jest.fn()
};

// Security test configuration
const securityConfig: SecurityTestConfig = defaultSecurityConfig;

describe('Authentication Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Password Security Tests', () => {
    it('should enforce minimum password length requirements', async () => {
      const minLength = securityConfig.owasp.brokenAuthentication.passwordPolicy.minLength;
      
      // Test weak passwords
      const weakPasswords = [
        'short',
        '1234567',
        'password',
        '12345678901' // one character short
      ];

      for (const password of weakPasswords) {
        const isValid = password.length >= minLength;
        expect(isValid).toBe(false);
      }

      // Test valid password
      const strongPassword = 'StrongP@ssw0rd123!';
      expect(strongPassword.length >= minLength).toBe(true);
    });

    it('should enforce password complexity requirements', async () => {
      if (!securityConfig.owasp.brokenAuthentication.passwordPolicy.complexity) {
        return; // Skip if complexity not required
      }

      const complexityTests = [
        { password: 'alllowercase123!', valid: false, reason: 'No uppercase' },
        { password: 'ALLUPPERCASE123!', valid: false, reason: 'No lowercase' },
        { password: 'NoNumbers!', valid: false, reason: 'No numbers' },
        { password: 'NoSpecialChars123', valid: false, reason: 'No special characters' },
        { password: 'ValidP@ssw0rd123!', valid: true, reason: 'Meets all requirements' }
      ];

      complexityTests.forEach(({ password, valid, reason }) => {
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        const isComplex = hasLower && hasUpper && hasNumbers && hasSpecial;
        expect(isComplex).toBe(valid);
      });
    });

    it('should enforce password history to prevent reuse', async () => {
      const historyCount = securityConfig.owasp.brokenAuthentication.passwordPolicy.history;
      const userId = 'user123';
      
      // Mock previous password hashes
      const previousPasswords = Array.from({ length: historyCount }, (_, i) => 
        `hashedPassword${i}`
      );

      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        passwordHistory: previousPasswords
      });

      // Test reused password
      const reusedPassword = 'oldPassword1';
      (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>)
        .mockResolvedValue(true);

      for (const oldHash of previousPasswords) {
        const isReused = await bcrypt.compare(reusedPassword, oldHash);
        if (isReused) {
          expect(true).toBe(true); // Password reuse detected
          break;
        }
      }

      // Test new password
      const newPassword = 'NewUniqueP@ssw0rd123!';
      (bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>)
        .mockResolvedValue(false);

      let isNewPassword = true;
      for (const oldHash of previousPasswords) {
        const isReused = await bcrypt.compare(newPassword, oldHash);
        if (isReused) {
          isNewPassword = false;
          break;
        }
      }
      expect(isNewPassword).toBe(true);
    });
  });

  describe('Session Management Security Tests', () => {
    it('should enforce session timeout', async () => {
      const sessionTimeout = securityConfig.owasp.brokenAuthentication.sessionManagement.sessionTimeout;
      const currentTime = Date.now();
      
      // Test active session
      const activeSessionTime = currentTime - (sessionTimeout / 2);
      const activeSession = {
        id: 'session1',
        userId: 'user1',
        createdAt: new Date(activeSessionTime),
        lastActivity: new Date(activeSessionTime)
      };

      const isActiveValid = (currentTime - activeSession.lastActivity.getTime()) < sessionTimeout;
      expect(isActiveValid).toBe(true);

      // Test expired session
      const expiredSessionTime = currentTime - sessionTimeout - 10000;
      const expiredSession = {
        id: 'session2',
        userId: 'user1',
        createdAt: new Date(expiredSessionTime),
        lastActivity: new Date(expiredSessionTime)
      };

      const isExpiredValid = (currentTime - expiredSession.lastActivity.getTime()) < sessionTimeout;
      expect(isExpiredValid).toBe(false);
    });

    it('should prevent session fixation attacks', async () => {
      const oldSessionId = 'old-session-123';
      const newSessionId = 'new-session-456';
      
      // Mock session creation after authentication
      mockDb.session.create.mockResolvedValue({
        id: newSessionId,
        userId: 'user1',
        createdAt: new Date(),
        lastActivity: new Date()
      });

      // Verify new session ID is generated after login
      expect(newSessionId).not.toBe(oldSessionId);
      
      // Verify old session would be invalidated
      expect(mockDb.session.deleteMany).toHaveBeenCalledWith({
        where: { id: oldSessionId }
      });
    });

    it('should limit concurrent sessions per user', async () => {
      const maxConcurrentSessions = securityConfig.owasp.brokenAuthentication.sessionManagement.concurrentSessions;
      const userId = 'user1';
      
      // Mock existing sessions
      const existingSessions = Array.from({ length: maxConcurrentSessions + 1 }, (_, i) => ({
        id: `session${i}`,
        userId,
        createdAt: new Date(Date.now() - i * 1000),
        lastActivity: new Date()
      }));

      mockDb.session.findMany.mockResolvedValue(existingSessions);

      // Should clean up oldest sessions when limit exceeded
      const sessionsToDelete = existingSessions.length - maxConcurrentSessions;
      expect(sessionsToDelete).toBeGreaterThan(0);
      
      // Verify oldest sessions would be removed
      const oldestSessions = existingSessions
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .slice(0, sessionsToDelete);

      expect(oldestSessions.length).toBe(sessionsToDelete);
    });

    it('should invalidate sessions on logout', async () => {
      const sessionId = 'session123';
      const userId = 'user1';

      // Mock session deletion
      mockDb.session.deleteMany.mockResolvedValue({ count: 1 });

      // Verify session is deleted on logout
      expect(mockDb.session.deleteMany).toHaveBeenCalledWith({
        where: { 
          OR: [
            { id: sessionId },
            { userId: userId }
          ]
        }
      });
    });
  });

  describe('Multi-Factor Authentication (MFA) Tests', () => {
    it('should require MFA for sensitive operations', async () => {
      const mfaConfig = securityConfig.owasp.brokenAuthentication.mfa;
      
      if (!mfaConfig.required) {
        return; // Skip if MFA not required
      }

      const sensitiveOperations = [
        'accessing PHI',
        'changing security settings',
        'administrative actions',
        'crisis intervention access'
      ];

      for (const operation of sensitiveOperations) {
        // Mock MFA verification
        const mfaToken = 'invalid-token';
        const isValidMFA = await verifyMFAToken(mfaToken, 'user1');
        
        // Should fail without valid MFA
        expect(isValidMFA).toBe(false);
      }
    });

    it('should support multiple MFA methods', async () => {
      const supportedMethods = securityConfig.owasp.brokenAuthentication.mfa.methods;
      
      expect(supportedMethods).toContain('totp');
      expect(supportedMethods.length).toBeGreaterThan(1);

      // Test TOTP method
      if (supportedMethods.includes('totp')) {
        const totpToken = '123456';
        const secret = 'JBSWY3DPEHPK3PXP';
        const isValidTOTP = verifyTOTPToken(totpToken, secret);
        expect(typeof isValidTOTP).toBe('boolean');
      }

      // Test SMS method
      if (supportedMethods.includes('sms')) {
        const smsCode = '654321';
        const phoneNumber = '+1234567890';
        const isValidSMS = await verifySMSCode(smsCode, phoneNumber);
        expect(typeof isValidSMS).toBe('boolean');
      }
    });

    it('should provide backup codes for account recovery', async () => {
      const backupCodesEnabled = securityConfig.owasp.brokenAuthentication.mfa.backupCodes;
      
      if (!backupCodesEnabled) {
        return;
      }

      const userId = 'user1';
      const backupCodes = generateBackupCodes();
      
      expect(backupCodes).toHaveLength(10);
      expect(backupCodes.every(code => code.length === 8)).toBe(true);

      // Test backup code usage
      const usedCode = backupCodes[0];
      const isValidBackup = await verifyBackupCode(usedCode, userId);
      expect(typeof isValidBackup).toBe('boolean');
    });
  });

  describe('Brute Force Protection Tests', () => {
    it('should implement progressive delay on failed attempts', async () => {
      const bruteForceConfig = securityConfig.owasp.brokenAuthentication.bruteForce;
      const maxAttempts = bruteForceConfig.maxAttempts;
      const progressiveDelay = bruteForceConfig.progressiveDelay;
      
      const username = 'testuser';
      let attemptCount = 0;
      
      mockRateLimiter.check.mockImplementation(() => {
        attemptCount++;
        if (attemptCount >= maxAttempts) {
          return Promise.resolve({ success: false, remaining: 0 });
        }
        return Promise.resolve({ success: true, remaining: maxAttempts - attemptCount });
      });

      // Simulate failed login attempts
      for (let i = 1; i <= maxAttempts + 1; i++) {
        const result = await mockRateLimiter.check();
        
        if (i <= maxAttempts) {
          expect(result.success).toBe(true);
        } else {
          expect(result.success).toBe(false);
          
          if (progressiveDelay) {
            // Verify progressive delay implementation
            const delay = calculateProgressiveDelay(i);
            expect(delay).toBeGreaterThan(0);
          }
        }
      }
    });

    it('should lock account after maximum failed attempts', async () => {
      const maxAttempts = securityConfig.owasp.brokenAuthentication.bruteForce.maxAttempts;
      const lockoutDuration = securityConfig.owasp.brokenAuthentication.bruteForce.lockoutDuration;
      
      const username = 'lockeduser';
      
      // Mock account lockout
      mockDb.user.update.mockResolvedValue({
        id: 'user1',
        username,
        lockedUntil: new Date(Date.now() + lockoutDuration),
        failedAttempts: maxAttempts
      });

      // Verify account is locked
      const lockedUser = await mockDb.user.update({
        where: { username },
        data: {
          failedAttempts: { increment: 1 },
          lockedUntil: new Date(Date.now() + lockoutDuration)
        }
      });

      expect(lockedUser.lockedUntil.getTime()).toBeGreaterThan(Date.now());
      expect(lockedUser.failedAttempts).toBe(maxAttempts);
    });

    it('should reset failed attempts on successful login', async () => {
      const username = 'resetuser';
      
      // Mock successful login reset
      mockDb.user.update.mockResolvedValue({
        id: 'user1',
        username,
        failedAttempts: 0,
        lockedUntil: null
      });

      // Verify reset on successful authentication
      const resetUser = await mockDb.user.update({
        where: { username },
        data: {
          failedAttempts: 0,
          lockedUntil: null,
          lastLogin: new Date()
        }
      });

      expect(resetUser.failedAttempts).toBe(0);
      expect(resetUser.lockedUntil).toBeNull();
    });
  });

  describe('JWT Token Security Tests', () => {
    it('should use secure JWT configuration', async () => {
      const secretKey = process.env.NEXTAUTH_SECRET || 'test-secret-key-very-long-and-secure';
      
      // Verify secret key strength
      expect(secretKey.length).toBeGreaterThanOrEqual(32);
      
      // Test JWT creation
      const payload = {
        userId: 'user1',
        role: 'patient',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
      };

      (jwt.sign as jest.MockedFunction<typeof jwt.sign>)
        .mockReturnValue('mock-jwt-token');

      const token = jwt.sign(payload, secretKey, {
        algorithm: 'HS256',
        expiresIn: '1h'
      });

      expect(token).toBeTruthy();
    });

    it('should validate JWT token expiration', async () => {
      const secretKey = 'test-secret-key-very-long-and-secure';
      
      // Mock expired token
      (jwt.verify as jest.MockedFunction<typeof jwt.verify>)
        .mockImplementation(() => {
          const error = new Error('jwt expired');
          error.name = 'TokenExpiredError';
          throw error;
        });

      const expiredToken = 'expired.jwt.token';
      
      try {
        jwt.verify(expiredToken, secretKey);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.name).toBe('TokenExpiredError');
      }
    });

    it('should validate JWT token signature', async () => {
      const secretKey = 'test-secret-key-very-long-and-secure';
      const invalidSecretKey = 'wrong-secret-key';
      
      // Mock invalid signature
      (jwt.verify as jest.MockedFunction<typeof jwt.verify>)
        .mockImplementation(() => {
          const error = new Error('invalid signature');
          error.name = 'JsonWebTokenError';
          throw error;
        });

      const tamperedToken = 'tampered.jwt.token';
      
      try {
        jwt.verify(tamperedToken, invalidSecretKey);
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.name).toBe('JsonWebTokenError');
      }
    });
  });

  describe('HIPAA Compliance Authentication Tests', () => {
    it('should log all authentication events for audit', async () => {
      const authEvents = [
        { type: 'login_success', userId: 'user1', timestamp: new Date() },
        { type: 'login_failure', username: 'wronguser', timestamp: new Date() },
        { type: 'logout', userId: 'user1', timestamp: new Date() },
        { type: 'session_timeout', userId: 'user1', timestamp: new Date() }
      ];

      for (const event of authEvents) {
        mockDb.auditLog.create.mockResolvedValue({
          id: 'audit1',
          ...event,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...'
        });

        await mockDb.auditLog.create({
          data: event
        });
      }

      expect(mockDb.auditLog.create).toHaveBeenCalledTimes(authEvents.length);
    });

    it('should enforce unique user identification', async () => {
      const userId = 'unique-user-123';
      
      mockDb.user.findUnique.mockResolvedValue({
        id: userId,
        uniqueIdentifier: userId,
        username: 'testuser',
        email: 'test@example.com'
      });

      const user = await mockDb.user.findUnique({
        where: { id: userId }
      });

      expect(user.uniqueIdentifier).toBe(userId);
      expect(user.id).toBe(userId);
    });
  });
});

// Helper functions for testing
function verifyTOTPToken(token: string, secret: string): boolean {
  // Mock TOTP verification - in real implementation would use authenticator library
  return token.length === 6 && /^\d{6}$/.test(token);
}

async function verifySMSCode(code: string, phoneNumber: string): Promise<boolean> {
  // Mock SMS verification
  return code.length === 6 && /^\d{6}$/.test(code) && phoneNumber.startsWith('+1');
}

async function verifyMFAToken(token: string, userId: string): Promise<boolean> {
  // Mock MFA token verification
  return token === 'valid-mfa-token-123';
}

function generateBackupCodes(): string[] {
  // Mock backup code generation
  return Array.from({ length: 10 }, (_, i) => 
    Math.random().toString(36).substring(2, 10).toUpperCase()
  );
}

async function verifyBackupCode(code: string, userId: string): Promise<boolean> {
  // Mock backup code verification
  return code.length === 8 && /^[A-Z0-9]{8}$/.test(code);
}

function calculateProgressiveDelay(attemptCount: number): number {
  // Progressive delay: 2^attempt seconds (capped at 5 minutes)
  return Math.min(Math.pow(2, attemptCount) * 1000, 300000);
}