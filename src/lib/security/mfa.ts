/**
 * Multi-Factor Authentication System
 * TOTP-based 2FA with SMS backup and recovery codes
 * Enforced for therapists, crisis counselors, and administrators
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { encryptionService } from './encryption';
import { auditService, AuditEventType } from './audit';
import twilio from 'twilio';

// MFA configuration
const MFA_CONFIG = {
  issuer: 'Astral Core Mental Health Platform',
  algorithm: 'SHA256',
  digits: 6,
  period: 30,
  window: 2, // Allow 2 time windows for clock drift
  backupCodesCount: 10,
  backupCodeLength: 8,
  smsCodeLength: 6,
  smsCodeExpiry: 300000, // 5 minutes
  maxAttempts: 5,
  lockoutDuration: 900000, // 15 minutes
  requiredRoles: ['THERAPIST', 'CRISIS_COUNSELOR', 'ADMIN', 'CLINICAL_SUPERVISOR']
};

// Twilio configuration for SMS backup
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  manualEntryKey: string;
}

interface MFAVerification {
  valid: boolean;
  remainingAttempts?: number;
  lockedUntil?: Date;
  requiresBackup?: boolean;
}

interface MFAStatus {
  enabled: boolean;
  method: 'totp' | 'sms' | 'backup' | null;
  backupCodesRemaining?: number;
  lastUsed?: Date;
  phoneNumber?: string;
  recoveryEmail?: string;
}

/**
 * Multi-Factor Authentication Service
 * Manages TOTP, SMS, and backup code authentication
 */
export class MFAService {
  private static instance: MFAService;
  private attemptTracker: Map<string, { count: number; lastAttempt: Date }> = new Map();

  private constructor() {
    // Configure TOTP settings
    authenticator.options = {
      algorithm: MFA_CONFIG.algorithm,
      digits: MFA_CONFIG.digits,
      period: MFA_CONFIG.period,
      window: MFA_CONFIG.window
    };
  }

  static getInstance(): MFAService {
    if (!MFAService.instance) {
      MFAService.instance = new MFAService();
    }
    return MFAService.instance;
  }

  /**
   * Check if MFA is required for user
   */
  async isMFARequired(userId: string, role?: string): Promise<boolean> {
    // Check if role requires MFA
    if (role && MFA_CONFIG.requiredRoles.includes(role)) {
      return true;
    }

    // Check user-specific MFA settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) return false;

    return (user as any).mfaRequired || MFA_CONFIG.requiredRoles.includes(user.role);
  }

  /**
   * Setup MFA for user
   */
  async setupMFA(userId: string, phoneNumber?: string): Promise<MFASetup> {
    // Generate secret key
    const secret = authenticator.generateSecret();

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate QR code
    const otpauth = authenticator.keyuri(
      user.email,
      MFA_CONFIG.issuer,
      secret
    );
    const qrCode = await QRCode.toDataURL(otpauth);

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Encrypt and store MFA settings
    const encryptedSecret = encryptionService.encrypt(secret);
    const encryptedBackupCodes = encryptionService.encrypt(JSON.stringify(backupCodes));

    await (prisma as any).mfaSettings.upsert({
      where: { userId },
      create: {
        userId,
        secret: JSON.stringify(encryptedSecret),
        backupCodes: JSON.stringify(encryptedBackupCodes),
        phoneNumber: phoneNumber ? encryptionService.encrypt(phoneNumber) : undefined,
        enabled: false,
        createdAt: new Date()
      },
      update: {
        secret: JSON.stringify(encryptedSecret),
        backupCodes: JSON.stringify(encryptedBackupCodes),
        phoneNumber: phoneNumber ? encryptionService.encrypt(phoneNumber) : undefined,
        updatedAt: new Date()
      }
    });

    // Log MFA setup initiation
    await auditService.log(
      AuditEventType.MFA_ENABLED,
      'MFA setup initiated',
      { userId },
      { method: phoneNumber ? 'totp_with_sms' : 'totp' }
    );

    return {
      secret,
      qrCode,
      backupCodes,
      manualEntryKey: this.formatSecretForManualEntry(secret)
    };
  }

  /**
   * Enable MFA after verification
   */
  async enableMFA(userId: string, token: string): Promise<boolean> {
    const settings = await (prisma as any).mfaSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      throw new Error('MFA not configured');
    }

    // Decrypt and verify token
    const encryptedSecret = JSON.parse(settings.secret);
    const secret = encryptionService.decrypt(encryptedSecret);

    const isValid = authenticator.verify({
      token,
      secret
    });

    if (!isValid) {
      await auditService.log(
        AuditEventType.MFA_CHALLENGE_FAILURE,
        'MFA activation failed - invalid token',
        { userId },
        {},
        false
      );
      return false;
    }

    // Enable MFA
    await (prisma as any).mfaSettings.update({
      where: { userId },
      data: {
        enabled: true,
        enabledAt: new Date(),
        lastUsed: new Date()
      }
    });

    // Update user record
    await prisma.user.update({
      where: { id: userId },
      data: { }
    });

    // Log successful activation
    await auditService.log(
      AuditEventType.MFA_ENABLED,
      'MFA successfully enabled',
      { userId },
      { method: 'totp' }
    );

    return true;
  }

  /**
   * Verify MFA token
   */
  async verifyToken(userId: string, token: string): Promise<MFAVerification> {
    // Check lockout status
    const lockout = this.checkLockout(userId);
    if (lockout.locked) {
      return {
        valid: false,
        lockedUntil: lockout.until
      };
    }

    const settings = await (prisma as any).mfaSettings.findUnique({
      where: { userId }
    });

    if (!settings || !settings.enabled) {
      return { valid: false };
    }

    // Decrypt secret
    const encryptedSecret = JSON.parse(settings.secret);
    const secret = encryptionService.decrypt(encryptedSecret);

    // Verify TOTP token
    const isValid = authenticator.verify({
      token,
      secret
    });

    if (isValid) {
      // Update last used
      await (prisma as any).mfaSettings.update({
        where: { userId },
        data: { lastUsed: new Date() }
      });

      // Clear attempt tracker
      this.attemptTracker.delete(userId);

      // Log successful verification
      await auditService.log(
        AuditEventType.MFA_CHALLENGE_SUCCESS,
        'MFA token verified',
        { userId },
        { method: 'totp' }
      );

      return { valid: true };
    }

    // Track failed attempt
    this.trackFailedAttempt(userId);
    const attempts = this.attemptTracker.get(userId);

    // Log failed verification
    await auditService.log(
      AuditEventType.MFA_CHALLENGE_FAILURE,
      'MFA token verification failed',
      { userId },
      { attemptNumber: attempts?.count },
      false
    );

    return {
      valid: false,
      remainingAttempts: MFA_CONFIG.maxAttempts - (attempts?.count || 0)
    };
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<MFAVerification> {
    const settings = await (prisma as any).mfaSettings.findUnique({
      where: { userId }
    });

    if (!settings || !settings.enabled) {
      return { valid: false };
    }

    // Decrypt backup codes
    const encryptedCodes = JSON.parse(settings.backupCodes);
    const backupCodes: string[] = JSON.parse(encryptionService.decrypt(encryptedCodes));

    // Check if code exists and hasn't been used
    const codeIndex = backupCodes.findIndex(c => c === code);
    if (codeIndex === -1) {
      await auditService.log(
        AuditEventType.MFA_CHALLENGE_FAILURE,
        'Invalid backup code attempted',
        { userId },
        {},
        false
      );
      return { valid: false };
    }

    // Mark code as used by removing it
    backupCodes.splice(codeIndex, 1);

    // Update backup codes
    const updatedEncryptedCodes = encryptionService.encrypt(JSON.stringify(backupCodes));
    await (prisma as any).mfaSettings.update({
      where: { userId },
      data: {
        backupCodes: JSON.stringify(updatedEncryptedCodes),
        lastUsed: new Date()
      }
    });

    // Log successful verification
    await auditService.log(
      AuditEventType.MFA_CHALLENGE_SUCCESS,
      'Backup code verified',
      { userId },
      { method: 'backup', remainingCodes: backupCodes.length }
    );

    // Warn if running low on backup codes
    if (backupCodes.length <= 2) {
      return {
        valid: true,
        requiresBackup: true
      };
    }

    return { valid: true };
  }

  /**
   * Send SMS verification code
   */
  async sendSMSCode(userId: string): Promise<boolean> {
    if (!twilioClient) {
      console.error('Twilio not configured for SMS authentication');
      return false;
    }

    const settings = await (prisma as any).mfaSettings.findUnique({
      where: { userId }
    });

    if (!settings || !settings.phoneNumber) {
      return false;
    }

    // Decrypt phone number
    const phoneNumber = encryptionService.decrypt(JSON.parse(settings.phoneNumber));

    // Generate SMS code
    const code = this.generateSMSCode();
    const expiry = new Date(Date.now() + MFA_CONFIG.smsCodeExpiry);

    // Store encrypted SMS code
    const encryptedCode = encryptionService.encrypt(code);
    await prisma.smsVerification.create({
      data: {
        userId,
        code: JSON.stringify(encryptedCode),
        expiresAt: expiry,
        attempts: 0
      }
    });

    try {
      // Send SMS
      await twilioClient.messages.create({
        body: `Your Astral Core verification code is: ${code}. This code expires in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });

      // Log SMS sent
      await auditService.log(
        AuditEventType.MFA_CHALLENGE_SUCCESS,
        'SMS verification code sent',
        { userId },
        { method: 'sms' }
      );

      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      await auditService.log(
        AuditEventType.MFA_CHALLENGE_FAILURE,
        'Failed to send SMS code',
        { userId },
        { error: (error as Error).message },
        false
      );
      return false;
    }
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(userId: string, code: string): Promise<MFAVerification> {
    const verification = await prisma.smsVerification.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        verified: false
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!verification) {
      return { valid: false };
    }

    // Check attempts
    if (verification.attempts >= MFA_CONFIG.maxAttempts) {
      return {
        valid: false,
        remainingAttempts: 0
      };
    }

    // Decrypt and verify code
    const encryptedCode = JSON.parse(verification.code);
    const storedCode = encryptionService.decrypt(encryptedCode);

    if (code === storedCode) {
      // Mark as verified
      await prisma.smsVerification.update({
        where: { id: verification.id },
        data: { verified: true }
      });

      // Update MFA last used
      await (prisma as any).mfaSettings.update({
        where: { userId },
        data: { lastUsed: new Date() }
      });

      // Log successful verification
      await auditService.log(
        AuditEventType.MFA_CHALLENGE_SUCCESS,
        'SMS code verified',
        { userId },
        { method: 'sms' }
      );

      return { valid: true };
    }

    // Increment attempts
    await prisma.smsVerification.update({
      where: { id: verification.id },
      data: { attempts: verification.attempts + 1 }
    });

    // Log failed verification
    await auditService.log(
      AuditEventType.MFA_CHALLENGE_FAILURE,
      'SMS code verification failed',
      { userId },
      { attemptNumber: verification.attempts + 1 },
      false
    );

    return {
      valid: false,
      remainingAttempts: MFA_CONFIG.maxAttempts - verification.attempts - 1
    };
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(userId: string, adminId?: string): Promise<void> {
    await (prisma as any).mfaSettings.update({
      where: { userId },
      data: {
        enabled: false,
        disabledAt: new Date()
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { }
    });

    // Log MFA disabled
    await auditService.log(
      AuditEventType.MFA_DISABLED,
      adminId ? 'MFA disabled by administrator' : 'MFA disabled by user',
      { userId },
      { disabledBy: adminId || userId }
    );
  }

  /**
   * Get MFA status for user
   */
  async getMFAStatus(userId: string): Promise<MFAStatus> {
    const settings = await (prisma as any).mfaSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      return {
        enabled: false,
        method: null
      };
    }

    let backupCodesRemaining = 0;
    if (settings.backupCodes) {
      const encryptedCodes = JSON.parse(settings.backupCodes);
      const codes: string[] = JSON.parse(encryptionService.decrypt(encryptedCodes));
      backupCodesRemaining = codes.length;
    }

    return {
      enabled: settings.enabled,
      method: settings.phoneNumber ? 'sms' : 'totp',
      backupCodesRemaining,
      lastUsed: settings.lastUsed || undefined,
      phoneNumber: settings.phoneNumber ? '***' + settings.phoneNumber.slice(-4) : undefined
    };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const backupCodes = this.generateBackupCodes();
    const encryptedCodes = encryptionService.encrypt(JSON.stringify(backupCodes));

    await (prisma as any).mfaSettings.update({
      where: { userId },
      data: {
        backupCodes: JSON.stringify(encryptedCodes),
        updatedAt: new Date()
      }
    });

    // Log backup codes regeneration
    await auditService.log(
      AuditEventType.MFA_ENABLED,
      'Backup codes regenerated',
      { userId },
      { count: backupCodes.length }
    );

    return backupCodes;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < MFA_CONFIG.backupCodesCount; i++) {
      const code = crypto.randomBytes(MFA_CONFIG.backupCodeLength / 2)
        .toString('hex')
        .toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Generate SMS verification code
   */
  private generateSMSCode(): string {
    const code = Math.floor(Math.random() * Math.pow(10, MFA_CONFIG.smsCodeLength))
      .toString()
      .padStart(MFA_CONFIG.smsCodeLength, '0');
    return code;
  }

  /**
   * Format secret for manual entry
   */
  private formatSecretForManualEntry(secret: string): string {
    return secret.match(/.{1,4}/g)?.join(' ') || secret;
  }

  /**
   * Track failed authentication attempts
   */
  private trackFailedAttempt(userId: string): void {
    const current = this.attemptTracker.get(userId) || { count: 0, lastAttempt: new Date() };
    current.count++;
    current.lastAttempt = new Date();
    this.attemptTracker.set(userId, current);
  }

  /**
   * Check if user is locked out
   */
  private checkLockout(userId: string): { locked: boolean; until?: Date } {
    const attempts = this.attemptTracker.get(userId);
    if (!attempts) {
      return { locked: false };
    }

    if (attempts.count >= MFA_CONFIG.maxAttempts) {
      const lockoutEnd = new Date(attempts.lastAttempt.getTime() + MFA_CONFIG.lockoutDuration);
      
      if (lockoutEnd > new Date()) {
        return { locked: true, until: lockoutEnd };
      }

      // Clear expired lockout
      this.attemptTracker.delete(userId);
    }

    return { locked: false };
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic international phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s()-]/g, ''));
  }

  /**
   * Emergency MFA bypass (requires admin approval)
   */
  async emergencyBypass(userId: string, adminId: string, reason: string): Promise<string> {
    // Generate temporary bypass token
    const bypassToken = encryptionService.generateSecureToken(32);
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    // Store encrypted bypass token
    const encryptedToken = encryptionService.encrypt(bypassToken);
    await (prisma as any).mfaBypass.create({
      data: {
        userId,
        token: JSON.stringify(encryptedToken),
        approvedBy: adminId,
        reason,
        expiresAt: expiry,
        used: false
      }
    });

    // Log emergency bypass
    await auditService.log(
      AuditEventType.MFA_DISABLED,
      'Emergency MFA bypass granted',
      { userId },
      {
        approvedBy: adminId,
        reason,
        expiresAt: expiry
      }
    );

    return bypassToken;
  }

  /**
   * Verify emergency bypass token
   */
  async verifyBypassToken(userId: string, token: string): Promise<boolean> {
    const bypass = await (prisma as any).mfaBypass.findFirst({
      where: {
        userId,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!bypass) {
      return false;
    }

    // Decrypt and verify token
    const encryptedToken = JSON.parse(bypass.token);
    const storedToken = encryptionService.decrypt(encryptedToken);

    if (token === storedToken) {
      // Mark as used
      await (prisma as any).mfaBypass.update({
        where: { id: bypass.id },
        data: { used: true, usedAt: new Date() }
      });

      // Log bypass usage
      await auditService.log(
        AuditEventType.MFA_CHALLENGE_SUCCESS,
        'Emergency bypass token used',
        { userId },
        { bypassId: bypass.id }
      );

      return true;
    }

    return false;
  }
}

// Export singleton instance
export const mfaService = MFAService.getInstance();

// Export convenience functions
export const setupMFA = (userId: string, phoneNumber?: string) => 
  mfaService.setupMFA(userId, phoneNumber);

export const verifyMFAToken = (userId: string, token: string) =>
  mfaService.verifyToken(userId, token);

export const isMFARequired = (userId: string, role?: string) =>
  mfaService.isMFARequired(userId, role);

export const getMFAStatus = (userId: string) =>
  mfaService.getMFAStatus(userId);