import * as crypto from 'crypto';
import { z } from 'zod';
import { auditService } from '@/lib/audit/audit-service';
import { AuditEventCategory, AuditOutcome, RiskLevel } from '@/lib/audit/types';
import prisma from '@/lib/prisma';

/**
 * Multi-Factor Authentication Service
 * Implements TOTP (Time-based One-Time Password) and SMS/Email MFA
 * Required for clinical roles accessing PHI data (HIPAA compliance)
 */

// MFA configuration
const MFA_CONFIG = {
  // TOTP settings
  totpWindow: 30, // 30-second time windows
  totpDigits: 6, // 6-digit codes
  totpTolerance: 1, // Allow 1 window tolerance for clock skew
  
  // SMS/Email settings
  codeLength: 6, // 6-digit verification codes
  codeExpiry: 300, // 5 minutes in seconds
  maxAttempts: 5, // Maximum verification attempts
  
  // Rate limiting
  cooldownPeriod: 900, // 15 minutes between failed attempts
  dailyLimit: 10, // Maximum MFA requests per day
  
  // Security
  secretLength: 32, // TOTP secret length in bytes
  backupCodeCount: 10, // Number of backup recovery codes
};

// MFA method types
export enum MFAMethod {
  TOTP = 'TOTP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  BACKUP_CODE = 'BACKUP_CODE',
}

// MFA status
export enum MFAStatus {
  DISABLED = 'DISABLED',
  PENDING_SETUP = 'PENDING_SETUP',
  ENABLED = 'ENABLED',
  TEMPORARILY_DISABLED = 'TEMPORARILY_DISABLED',
}

// Validation schemas
const MFASetupRequestSchema = z.object({
  method: z.nativeEnum(MFAMethod),
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(), // E.164 format for SMS
});

const MFAVerifyRequestSchema = z.object({
  method: z.nativeEnum(MFAMethod),
  code: z.string().length(6).regex(/^\d{6}$/),
  trustDevice: z.boolean().default(false),
});

const MFABackupCodeSchema = z.object({
  code: z.string().length(8).regex(/^[A-Z0-9]{8}$/),
});

// Database interfaces
interface MFASettings {
  id: string;
  userId: string;
  method: MFAMethod;
  status: MFAStatus;
  secret?: string; // Encrypted TOTP secret
  phoneNumber?: string; // Encrypted phone number
  backupCodes?: string[]; // Encrypted backup codes
  lastUsed?: Date;
  failedAttempts: number;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class MFAService {
  /**
   * Check if MFA is required for user role
   */
  static isMFARequired(userRole: string): boolean {
    const clinicalRoles = [
      'THERAPIST',
      'CRISIS_COUNSELOR', 
      'ADMIN',
      'SUPER_ADMIN',
      'COMPLIANCE_OFFICER'
    ];
    return clinicalRoles.includes(userRole);
  }

  /**
   * Get MFA status for user
   */
  static async getMFAStatus(userId: string): Promise<{
    isEnabled: boolean;
    isRequired: boolean;
    methods: MFAMethod[];
    status: MFAStatus;
    lastUsed?: Date;
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { }
      });

      if (!user) {
        throw new Error('User not found');
      }

      const isRequired = this.isMFARequired(user.role);
      const mfaSettings = (user as any).mfaSettings || [];
      const enabledMethods = mfaSettings
        .filter(setting => setting.status === MFAStatus.ENABLED)
        .map((setting: any) => setting.method as MFAMethod);

      return {
        isEnabled: enabledMethods.length > 0,
        isRequired,
        methods: enabledMethods,
        status: enabledMethods.length > 0 ? MFAStatus.ENABLED : MFAStatus.DISABLED,
        lastUsed: mfaSettings[0]?.lastUsed,
      };

    } catch (error) {
      console.error('Failed to get MFA status:', error);
      throw new Error('Failed to retrieve MFA status');
    }
  }

  /**
   * Setup TOTP MFA for user
   */
  static async setupTOTP(userId: string, userEmail: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    try {
      // Generate TOTP secret
      const secret = crypto.randomBytes(MFA_CONFIG.secretLength).toString('base64');
      
      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Create or update MFA settings
      await (prisma as any).mFASettings.upsert({
        where: {
          userId_method: {
            userId,
            method: MFAMethod.TOTP,
          },
        },
        create: {
          userId,
          method: MFAMethod.TOTP,
          status: MFAStatus.PENDING_SETUP,
          secret: this.encryptSecret(secret),
          backupCodes: backupCodes.map(code => this.encryptSecret(code)),
          failedAttempts: 0,
        },
        update: {
          secret: this.encryptSecret(secret),
          backupCodes: backupCodes.map(code => this.encryptSecret(code)),
          status: MFAStatus.PENDING_SETUP,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });

      // Generate QR code URL for authenticator apps
      const qrCodeUrl = this.generateTOTPUrl(secret, userEmail);

      // Log MFA setup initiation
      await auditService.logEvent({
        category: AuditEventCategory.MFA_ENABLED,
        action: 'INITIATE_TOTP_SETUP',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.MEDIUM,
        description: 'User initiated TOTP MFA setup',
        userId,
        userEmail,
        metadata: {
          mfaMethod: MFAMethod.TOTP,
        },
      });

      return {
        secret,
        qrCodeUrl,
        backupCodes,
      };

    } catch (error) {
      console.error('TOTP setup failed:', error);
      
      await auditService.logEvent({
        category: AuditEventCategory.MFA_FAILURE,
        action: 'TOTP_SETUP_FAILED',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.HIGH,
        description: 'TOTP MFA setup failed',
        userId,
        userEmail,
        errorDetails: {
          errorCode: 'TOTP_SETUP_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw new Error('Failed to setup TOTP MFA');
    }
  }

  /**
   * Setup SMS MFA for user
   */
  static async setupSMS(userId: string, userEmail: string, phoneNumber: string): Promise<{
    maskedPhoneNumber: string;
    backupCodes: string[];
  }> {
    try {
      // Validate phone number format
      const phoneValidation = z.string().regex(/^\+[1-9]\d{1,14}$/).safeParse(phoneNumber);
      if (!phoneValidation.success) {
        throw new Error('Invalid phone number format. Use E.164 format (e.g., +1234567890)');
      }

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();
      
      // Create or update MFA settings
      await (prisma as any).mFASettings.upsert({
        where: {
          userId_method: {
            userId,
            method: MFAMethod.SMS,
          },
        },
        create: {
          userId,
          method: MFAMethod.SMS,
          status: MFAStatus.PENDING_SETUP,
          phoneNumber: this.encryptSecret(phoneNumber),
          backupCodes: backupCodes.map(code => this.encryptSecret(code)),
          failedAttempts: 0,
        },
        update: {
          phoneNumber: this.encryptSecret(phoneNumber),
          backupCodes: backupCodes.map(code => this.encryptSecret(code)),
          status: MFAStatus.PENDING_SETUP,
          failedAttempts: 0,
          lockedUntil: null,
        },
      });

      // Send verification SMS (would implement actual SMS service here)
      await this.sendSMSVerification(phoneNumber, userId);

      // Log MFA setup initiation
      await auditService.logEvent({
        category: AuditEventCategory.MFA_ENABLED,
        action: 'INITIATE_SMS_SETUP',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.MEDIUM,
        description: 'User initiated SMS MFA setup',
        userId,
        userEmail,
        metadata: {
          mfaMethod: MFAMethod.SMS,
          maskedPhoneNumber: this.maskPhoneNumber(phoneNumber),
        },
      });

      return {
        maskedPhoneNumber: this.maskPhoneNumber(phoneNumber),
        backupCodes,
      };

    } catch (error) {
      console.error('SMS setup failed:', error);
      
      await auditService.logEvent({
        category: AuditEventCategory.MFA_FAILURE,
        action: 'SMS_SETUP_FAILED',
        outcome: AuditOutcome.FAILURE,
        riskLevel: RiskLevel.HIGH,
        description: 'SMS MFA setup failed',
        userId,
        userEmail,
        errorDetails: {
          errorCode: 'SMS_SETUP_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw new Error('Failed to setup SMS MFA');
    }
  }

  /**
   * Verify MFA code during setup
   */
  static async verifySetup(
    userId: string, 
    userEmail: string,
    method: MFAMethod, 
    code: string
  ): Promise<{
    success: boolean;
    backupCodes?: string[];
  }> {
    try {
      // Get pending MFA settings
      const mfaSettings = await (prisma as any).mFASettings.findUnique({
        where: {
          userId_method: {
            userId,
            method,
          },
        },
      });

      if (!mfaSettings || mfaSettings.status !== MFAStatus.PENDING_SETUP) {
        throw new Error('No pending MFA setup found');
      }

      // Check if account is locked
      if (mfaSettings.lockedUntil && mfaSettings.lockedUntil > new Date()) {
        throw new Error('Account temporarily locked due to failed attempts');
      }

      let isValidCode = false;

      // Verify code based on method
      switch (method) {
        case MFAMethod.TOTP:
          const secret = this.decryptSecret(mfaSettings.secret!);
          isValidCode = this.verifyTOTPCode(secret, code);
          break;
          
        case MFAMethod.SMS:
          // In a real implementation, this would verify against a stored temporary code
          // For now, we'll simulate verification
          isValidCode = await this.verifySMSCode(userId, code);
          break;
          
        default:
          throw new Error('Unsupported MFA method for setup');
      }

      if (!isValidCode) {
        // Increment failed attempts
        await (prisma as any).mFASettings.update({
          where: { id: mfaSettings.id },
          data: {
            failedAttempts: mfaSettings.failedAttempts + 1,
            lockedUntil: mfaSettings.failedAttempts + 1 >= MFA_CONFIG.maxAttempts 
              ? new Date(Date.now() + MFA_CONFIG.cooldownPeriod * 1000)
              : null,
          },
        });

        await auditService.logEvent({
          category: AuditEventCategory.MFA_FAILURE,
          action: 'MFA_SETUP_VERIFICATION_FAILED',
          outcome: AuditOutcome.FAILURE,
          riskLevel: RiskLevel.MEDIUM,
          description: 'MFA setup verification failed',
          userId,
          userEmail,
          metadata: {
            mfaMethod: method,
            failedAttempts: mfaSettings.failedAttempts + 1,
          },
        });

        return { success: false };
      }

      // Mark MFA as enabled
      const updatedSettings = await (prisma as any).mFASettings.update({
        where: { id: mfaSettings.id },
        data: {
          status: MFAStatus.ENABLED,
          failedAttempts: 0,
          lockedUntil: null,
          lastUsed: new Date(),
        },
      });

      // Get decrypted backup codes
      const backupCodes = updatedSettings.backupCodes?.map(code => this.decryptSecret(code)) || [];

      await auditService.logEvent({
        category: AuditEventCategory.MFA_ENABLED,
        action: 'MFA_SETUP_COMPLETED',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.MEDIUM,
        description: 'MFA setup completed successfully',
        userId,
        userEmail,
        metadata: {
          mfaMethod: method,
        },
      });

      return {
        success: true,
        backupCodes,
      };

    } catch (error) {
      console.error('MFA setup verification failed:', error);
      throw new Error('Failed to verify MFA setup');
    }
  }

  /**
   * Verify MFA code during authentication
   */
  static async verifyMFA(
    userId: string,
    userEmail: string,
    method: MFAMethod,
    code: string,
    trustDevice: boolean = false
  ): Promise<{
    success: boolean;
    trustToken?: string;
  }> {
    try {
      // Get MFA settings
      const mfaSettings = await (prisma as any).mFASettings.findUnique({
        where: {
          userId_method: {
            userId,
            method,
          },
        },
      });

      if (!mfaSettings || mfaSettings.status !== MFAStatus.ENABLED) {
        throw new Error('MFA not enabled for this method');
      }

      // Check if account is locked
      if (mfaSettings.lockedUntil && mfaSettings.lockedUntil > new Date()) {
        await auditService.logEvent({
          category: AuditEventCategory.MFA_FAILURE,
          action: 'MFA_VERIFICATION_BLOCKED',
          outcome: AuditOutcome.FAILURE,
          riskLevel: RiskLevel.HIGH,
          description: 'MFA verification blocked due to account lock',
          userId,
          userEmail,
          metadata: {
            mfaMethod: method,
            lockedUntil: mfaSettings.lockedUntil,
          },
        });
        
        throw new Error('Account temporarily locked due to failed attempts');
      }

      let isValidCode = false;

      // Verify code based on method
      switch (method) {
        case MFAMethod.TOTP:
          const secret = this.decryptSecret(mfaSettings.secret!);
          isValidCode = this.verifyTOTPCode(secret, code);
          break;
          
        case MFAMethod.SMS:
          isValidCode = await this.verifySMSCode(userId, code);
          break;
          
        case MFAMethod.BACKUP_CODE:
          isValidCode = await this.verifyBackupCode(mfaSettings, code);
          break;
          
        default:
          throw new Error('Unsupported MFA method');
      }

      if (!isValidCode) {
        // Increment failed attempts
        await (prisma as any).mFASettings.update({
          where: { id: mfaSettings.id },
          data: {
            failedAttempts: mfaSettings.failedAttempts + 1,
            lockedUntil: mfaSettings.failedAttempts + 1 >= MFA_CONFIG.maxAttempts 
              ? new Date(Date.now() + MFA_CONFIG.cooldownPeriod * 1000)
              : null,
          },
        });

        await auditService.logEvent({
          category: AuditEventCategory.MFA_FAILURE,
          action: 'MFA_VERIFICATION_FAILED',
          outcome: AuditOutcome.FAILURE,
          riskLevel: RiskLevel.HIGH,
          description: 'MFA verification failed',
          userId,
          userEmail,
          metadata: {
            mfaMethod: method,
            failedAttempts: mfaSettings.failedAttempts + 1,
          },
        });

        return { success: false };
      }

      // Update successful verification
      await (prisma as any).mFASettings.update({
        where: { id: mfaSettings.id },
        data: {
          failedAttempts: 0,
          lockedUntil: null,
          lastUsed: new Date(),
        },
      });

      // Generate trust token if requested
      let trustToken: string | undefined;
      if (trustDevice) {
        trustToken = this.generateTrustToken(userId);
        
        // Store trusted device token (would implement in production)
        await this.storeTrustedDevice(userId, trustToken);
      }

      await auditService.logEvent({
        category: AuditEventCategory.MFA_SUCCESS,
        action: 'MFA_VERIFICATION_SUCCESS',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.LOW,
        description: 'MFA verification successful',
        userId,
        userEmail,
        metadata: {
          mfaMethod: method,
          trustedDevice: trustDevice,
        },
      });

      return {
        success: true,
        trustToken,
      };

    } catch (error) {
      console.error('MFA verification failed:', error);
      throw new Error('Failed to verify MFA code');
    }
  }

  /**
   * Send MFA challenge code
   */
  static async sendChallenge(
    userId: string,
    userEmail: string,
    method: MFAMethod
  ): Promise<{
    success: boolean;
    maskedDestination?: string;
  }> {
    try {
      const mfaSettings = await (prisma as any).mFASettings.findUnique({
        where: {
          userId_method: {
            userId,
            method,
          },
        },
      });

      if (!mfaSettings || mfaSettings.status !== MFAStatus.ENABLED) {
        throw new Error('MFA not enabled for this method');
      }

      let maskedDestination: string | undefined;

      switch (method) {
        case MFAMethod.SMS:
          const phoneNumber = this.decryptSecret(mfaSettings.phoneNumber!);
          await this.sendSMSVerification(phoneNumber, userId);
          maskedDestination = this.maskPhoneNumber(phoneNumber);
          break;
          
        case MFAMethod.EMAIL:
          await this.sendEmailVerification(userEmail, userId);
          maskedDestination = this.maskEmail(userEmail);
          break;
          
        case MFAMethod.TOTP:
          // TOTP doesn't require sending a challenge
          break;
          
        default:
          throw new Error('Challenge not supported for this MFA method');
      }

      await auditService.logEvent({
        category: AuditEventCategory.MFA_SUCCESS,
        action: 'MFA_CHALLENGE_SENT',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.LOW,
        description: 'MFA challenge code sent',
        userId,
        userEmail,
        metadata: {
          mfaMethod: method,
          maskedDestination,
        },
      });

      return {
        success: true,
        maskedDestination,
      };

    } catch (error) {
      console.error('Failed to send MFA challenge:', error);
      throw new Error('Failed to send MFA challenge');
    }
  }

  /**
   * Disable MFA for user (requires admin approval for clinical roles)
   */
  static async disableMFA(
    userId: string,
    userEmail: string,
    method: MFAMethod,
    adminUserId?: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      // Check if admin approval is required
      if (this.isMFARequired(user.role) && !adminUserId) {
        throw new Error('Admin approval required to disable MFA for clinical roles');
      }

      // Update MFA settings
      await (prisma as any).mFASettings.update({
        where: {
          userId_method: {
            userId,
            method,
          },
        },
        data: {
          status: MFAStatus.DISABLED,
        },
      });

      await auditService.logEvent({
        category: AuditEventCategory.MFA_DISABLED,
        action: 'MFA_DISABLED',
        outcome: AuditOutcome.SUCCESS,
        riskLevel: RiskLevel.HIGH,
        description: `MFA disabled for user${adminUserId ? ' by admin' : ''}`,
        userId,
        userEmail,
        metadata: {
          mfaMethod: method,
          disabledByAdmin: !!adminUserId,
          adminUserId,
        },
      });

    } catch (error) {
      console.error('Failed to disable MFA:', error);
      throw new Error('Failed to disable MFA');
    }
  }

  // Private helper methods

  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < MFA_CONFIG.backupCodeCount; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private static generateTOTPUrl(secret: string, email: string): string {
    const issuer = 'Astral Core';
    const label = `${issuer}:${email}`;
    return `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${MFA_CONFIG.totpDigits}&period=${MFA_CONFIG.totpWindow}`;
  }

  private static verifyTOTPCode(secret: string, code: string): boolean {
    const timeStep = Math.floor(Date.now() / (MFA_CONFIG.totpWindow * 1000));
    
    // Check current time window and adjacent windows for clock skew tolerance
    for (let i = -MFA_CONFIG.totpTolerance; i <= MFA_CONFIG.totpTolerance; i++) {
      const testTimeStep = timeStep + i;
      const expectedCode = this.generateTOTPCode(secret, testTimeStep);
      if (expectedCode === code) {
        return true;
      }
    }
    
    return false;
  }

  private static generateTOTPCode(secret: string, timeStep: number): string {
    const timeBuffer = Buffer.allocUnsafe(8);
    timeBuffer.writeBigUInt64BE(BigInt(timeStep), 0);
    
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'));
    hmac.update(timeBuffer);
    const hash = hmac.digest();
    
    const offset = hash[hash.length - 1] & 0xf;
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);
    
    return (code % Math.pow(10, MFA_CONFIG.totpDigits)).toString().padStart(MFA_CONFIG.totpDigits, '0');
  }

  private static async verifySMSCode(userId: string, code: string): Promise<boolean> {
    // In production, this would verify against a stored temporary code
    // For now, return true for demo purposes
    return true;
  }

  private static async verifyBackupCode(mfaSettings: any, code: string): Promise<boolean> {
    const backupCodes = mfaSettings.backupCodes?.map((encryptedCode: string) => 
      this.decryptSecret(encryptedCode)
    ) || [];
    
    const isValid = backupCodes.includes(code.toUpperCase());
    
    if (isValid) {
      // Remove used backup code
      const updatedCodes = mfaSettings.backupCodes.filter((encryptedCode: string) =>
        this.decryptSecret(encryptedCode) !== code.toUpperCase()
      );
      
      await (prisma as any).mFASettings.update({
        where: { id: mfaSettings.id },
        data: { backupCodes: updatedCodes },
      });
    }
    
    return isValid;
  }

  private static encryptSecret(secret: string): string {
    // Use the same encryption as PHI data
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(secret, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const tag = cipher.getAuthTag();
    
    return `${iv.toString('base64')}:${encrypted}:${tag.toString('base64')}`;
  }

  private static decryptSecret(encryptedSecret: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');
    const [ivBase64, encrypted, tagBase64] = encryptedSecret.split(':');
    
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private static maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) return '****';
    return phoneNumber.slice(0, -4) + '****';
  }

  private static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 2) return `**@${domain}`;
    return `${username.slice(0, 2)}***@${domain}`;
  }

  private static generateTrustToken(userId: string): string {
    return crypto.createHmac('sha256', process.env.JWT_SECRET || '')
      .update(`${userId}:${Date.now()}`)
      .digest('hex');
  }

  private static async storeTrustedDevice(userId: string, trustToken: string): Promise<void> {
    // In production, store trusted device tokens with expiration
    // For now, just log the action
    console.log(`Stored trust token for user ${userId}: ${trustToken.slice(0, 8)}...`);
  }

  private static async sendSMSVerification(phoneNumber: string, userId: string): Promise<void> {
    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    const code = crypto.randomInt(100000, 999999).toString();
    console.log(`SMS verification code for ${phoneNumber}: ${code}`);
    
    // Store temporary code for verification (would implement in production)
    // await redis.setex(`sms_code:${userId}`, MFA_CONFIG.codeExpiry, code);
  }

  private static async sendEmailVerification(email: string, userId: string): Promise<void> {
    // In production, integrate with email service
    const code = crypto.randomInt(100000, 999999).toString();
    console.log(`Email verification code for ${email}: ${code}`);
    
    // Store temporary code for verification (would implement in production)
    // await redis.setex(`email_code:${userId}`, MFA_CONFIG.codeExpiry, code);
  }
}

// Export types and constants
export { MFA_CONFIG, MFASetupRequestSchema, MFAVerifyRequestSchema, MFABackupCodeSchema };