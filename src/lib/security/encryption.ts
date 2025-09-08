/**
 * Field-Level Encryption System for PHI Data
 * HIPAA-compliant encryption for Protected Health Information
 * Implements AES-256-GCM encryption with key rotation and management
 */

import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const ITERATIONS = 100000;

// PHI field identifiers for automatic encryption
const PHI_FIELDS = [
  'therapyNotes',
  'crisisReports',
  'personalInfo',
  'journalEntries',
  'moodData',
  'assessmentResults',
  'medications',
  'diagnosis',
  'treatmentPlans',
  'emergencyContacts',
  'insuranceInfo',
  'sessionNotes'
];

interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
  keyVersion: number;
}

interface KeyMetadata {
  id: string;
  version: number;
  createdAt: Date;
  rotatedAt?: Date;
  algorithm: string;
  status: 'active' | 'retired' | 'compromised';
}

/**
 * Secure Key Management System
 * Handles key generation, storage, rotation, and retrieval
 */
class KeyManagement {
  private static instance: KeyManagement;
  private masterKey: Buffer;
  private dataKeys: Map<number, Buffer> = new Map();
  private currentKeyVersion: number = 1;

  private constructor() {
    // Initialize master key from secure environment variable or HSM
    this.masterKey = this.deriveMasterKey();
    this.loadDataKeys();
  }

  static getInstance(): KeyManagement {
    if (!KeyManagement.instance) {
      KeyManagement.instance = new KeyManagement();
    }
    return KeyManagement.instance;
  }

  /**
   * Derive master key from secure source
   * In production, this should interface with HSM or KMS
   */
  private deriveMasterKey(): Buffer {
    const masterSecret = process.env.MASTER_ENCRYPTION_KEY;
    if (!masterSecret) {
      throw new Error('Master encryption key not configured');
    }

    const salt = process.env.ENCRYPTION_SALT || 'astral-core-v5-salt';
    return crypto.pbkdf2Sync(masterSecret, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  }

  /**
   * Load or generate data encryption keys
   */
  private async loadDataKeys(): Promise<void> {
    try {
      // Load existing keys from secure storage
      const keys = await (prisma as any).encryptionKey.findMany({
        where: { status: 'active' },
        orderBy: { version: 'desc' }
      });

      if (keys.length === 0) {
        // Generate initial key
        await this.generateNewKey();
      } else {
        // Decrypt and load keys
        keys.forEach(key => {
          const decryptedKey = this.decryptKey(key.encryptedKey);
          this.dataKeys.set(key.version, decryptedKey);
          this.currentKeyVersion = Math.max(this.currentKeyVersion, key.version);
        });
      }
    } catch (error) {
      console.error('Error loading encryption keys:', error);
      // Generate emergency key if database is not available
      this.generateEmergencyKey();
    }
  }

  /**
   * Generate new data encryption key
   */
  async generateNewKey(): Promise<void> {
    const newKey = crypto.randomBytes(KEY_LENGTH);
    const version = this.currentKeyVersion + 1;

    // Encrypt the data key with master key
    const encryptedKey = this.encryptKey(newKey);

    // Store encrypted key in database
    await (prisma as any).encryptionKey.create({
      data: {
        version,
        encryptedKey,
        algorithm: ALGORITHM,
        status: 'active',
        createdAt: new Date()
      }
    });

    this.dataKeys.set(version, newKey);
    this.currentKeyVersion = version;

    // Log key rotation for audit
    await this.logKeyRotation(version);
  }

  /**
   * Encrypt data key with master key
   */
  private encryptKey(key: Buffer): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.masterKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(key),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  /**
   * Decrypt data key with master key
   */
  private decryptKey(encryptedKey: string): Buffer {
    const buffer = Buffer.from(encryptedKey, 'base64');
    
    const iv = buffer.slice(0, IV_LENGTH);
    const tag = buffer.slice(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buffer.slice(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.masterKey, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Generate emergency key for system recovery
   */
  private generateEmergencyKey(): void {
    const emergencyKey = crypto.pbkdf2Sync(
      this.masterKey.toString('hex'),
      'emergency-salt',
      ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );
    this.dataKeys.set(0, emergencyKey);
  }

  /**
   * Get current encryption key
   */
  getCurrentKey(): { key: Buffer; version: number } {
    const key = this.dataKeys.get(this.currentKeyVersion);
    if (!key) {
      throw new Error('No active encryption key available');
    }
    return { key, version: this.currentKeyVersion };
  }

  /**
   * Get specific version of encryption key
   */
  getKey(version: number): Buffer {
    const key = this.dataKeys.get(version);
    if (!key) {
      throw new Error(`Encryption key version ${version} not found`);
    }
    return key;
  }

  /**
   * Rotate encryption keys
   */
  async rotateKeys(): Promise<void> {
    // Mark current keys as retired
    await (prisma as any).encryptionKey.updateMany({
      where: { status: 'active' },
      data: { status: 'retired', rotatedAt: new Date() }
    });

    // Generate new key
    await this.generateNewKey();

    // Re-encrypt existing data with new key (in background)
    this.scheduleDataReEncryption();
  }

  /**
   * Schedule re-encryption of existing data
   */
  private async scheduleDataReEncryption(): Promise<void> {
    // This would be handled by a background job in production
    console.log('Scheduled data re-encryption with new key version:', this.currentKeyVersion);
  }

  /**
   * Log key rotation for audit trail
   */
  private async logKeyRotation(version: number): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'KEY_ROTATION',
        
        details: {
          keyVersion: version,
          algorithm: ALGORITHM,
          timestamp: new Date().toISOString()
        },
        ipAddress: 'system',
        userAgent: 'KeyManagement'
      }
    });
  }
}

/**
 * Field-Level Encryption Service
 * Handles encryption/decryption of PHI fields
 */
export class EncryptionService {
  private keyManager: KeyManagement;

  constructor() {
    this.keyManager = KeyManagement.getInstance();
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): EncryptedData {
    const { key, version } = this.keyManager.getCurrentKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      keyVersion: version
    };
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: EncryptedData): string {
    const key = this.keyManager.getKey(encryptedData.keyVersion);
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(encryptedData.iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.encrypted, 'base64')),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Encrypt object with PHI fields
   */
  encryptObject<T extends Record<string, any>>(obj: T): T {
    const encrypted = { ...obj };

    for (const field of PHI_FIELDS) {
      if (field in encrypted && encrypted[field]) {
        const encryptedData = this.encrypt(
          typeof encrypted[field] === 'string' 
            ? encrypted[field] 
            : JSON.stringify(encrypted[field])
        );
        encrypted[field] = JSON.stringify(encryptedData);
      }
    }

    return encrypted;
  }

  /**
   * Decrypt object with PHI fields
   */
  decryptObject<T extends Record<string, any>>(obj: T): T {
    const decrypted = { ...obj };

    for (const field of PHI_FIELDS) {
      if (field in decrypted && decrypted[field]) {
        try {
          const encryptedData = JSON.parse(decrypted[field] as string);
          const decryptedValue = this.decrypt(encryptedData);
          
          try {
            decrypted[field] = JSON.parse(decryptedValue);
          } catch {
            decrypted[field] = decryptedValue;
          }
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Leave field as-is if decryption fails
        }
      }
    }

    return decrypted;
  }

  /**
   * Hash sensitive data for searching
   */
  hash(data: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Verify data integrity
   */
  verifyIntegrity(data: string, signature: string): boolean {
    const { key } = this.keyManager.getCurrentKey();
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data);
    const computedSignature = hmac.digest('hex');
    
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(computedSignature, 'hex')
    );
  }

  /**
   * Create data signature for integrity verification
   */
  createSignature(data: string): string {
    const { key } = this.keyManager.getCurrentKey();
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data);
    return hmac.digest('hex');
  }

  /**
   * Secure file encryption for uploads
   */
  async encryptFile(buffer: Buffer): Promise<{ encrypted: Buffer; metadata: EncryptedData }> {
    const { key, version } = this.keyManager.getCurrentKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      metadata: {
        encrypted: '',
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
        keyVersion: version
      }
    };
  }

  /**
   * Secure file decryption
   */
  async decryptFile(encrypted: Buffer, metadata: EncryptedData): Promise<Buffer> {
    const key = this.keyManager.getKey(metadata.keyVersion);
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(metadata.iv, 'base64')
    );

    decipher.setAuthTag(Buffer.from(metadata.tag, 'base64'));

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
  }

  /**
   * Rotate encryption keys (admin function)
   */
  async rotateKeys(): Promise<void> {
    await this.keyManager.rotateKeys();
  }
}

// Export singleton instance
export const encryptionService = new EncryptionService();

// Export utility functions
export const encryptPHI = (data: string) => encryptionService.encrypt(data);
export const decryptPHI = (data: EncryptedData) => encryptionService.decrypt(data);
export const hashPHI = (data: string) => encryptionService.hash(data);
export const generateToken = (length?: number) => encryptionService.generateSecureToken(length);