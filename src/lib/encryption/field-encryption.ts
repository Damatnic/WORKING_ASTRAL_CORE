import * as crypto from 'crypto';
import { z } from 'zod';

/**
 * Field-level encryption utility for PHI data
 * Uses AES-256-GCM for authenticated encryption
 * Each field has its own unique initialization vector (IV)
 */

// Configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit IV for GCM
const TAG_LENGTH = 16; // 128-bit authentication tag
const KEY_LENGTH = 32; // 256-bit key

// Environment validation
const encryptionConfigSchema = z.object({
  FIELD_ENCRYPTION_KEY: z.string().min(64, 'Field encryption key must be at least 64 characters (hex)'),
  FIELD_ENCRYPTION_PEPPER: z.string().min(32, 'Field encryption pepper must be at least 32 characters'),
});

// Default development values (should be overridden in production)
const defaultConfig = {
  FIELD_ENCRYPTION_KEY: 'a'.repeat(64), // Dummy 64-char hex string for development
  FIELD_ENCRYPTION_PEPPER: 'development-pepper-do-not-use-in-production',
};

let encryptionConfig: z.infer<typeof encryptionConfigSchema>;

// Only validate in production or when keys are provided
if (process.env.NODE_ENV === 'production' || process.env.FIELD_ENCRYPTION_KEY) {
  try {
    encryptionConfig = encryptionConfigSchema.parse({
      FIELD_ENCRYPTION_KEY: process.env.FIELD_ENCRYPTION_KEY || defaultConfig.FIELD_ENCRYPTION_KEY,
      FIELD_ENCRYPTION_PEPPER: process.env.FIELD_ENCRYPTION_PEPPER || defaultConfig.FIELD_ENCRYPTION_PEPPER,
    });
  } catch (error) {
    console.error('Field encryption configuration error:', error);
    // Use defaults if validation fails
    encryptionConfig = defaultConfig;
  }
} else {
  // Use defaults for development
  encryptionConfig = defaultConfig;
}

// Derive key from master key and field context
function deriveFieldKey(fieldType: string, userId?: string): Buffer {
  const context = `${fieldType}:${userId || 'global'}:${encryptionConfig.FIELD_ENCRYPTION_PEPPER}`;
  const masterKey = Buffer.from(encryptionConfig.FIELD_ENCRYPTION_KEY, 'hex');
  
  // Use HKDF to derive field-specific key
  return crypto.hkdfSync('sha256', masterKey, Buffer.alloc(0), Buffer.from(context), KEY_LENGTH);
}

// Encrypted field structure
export interface EncryptedField {
  data: string; // Base64 encoded: IV + encrypted_data + auth_tag
  version: number; // Encryption version for key rotation
  fieldType: string; // Field type for key derivation
  timestamp: string; // ISO timestamp of encryption
}

// Field types that require encryption (PHI data)
export const PHI_FIELD_TYPES = {
  // Personal identifiers
  FULL_NAME: 'full_name',
  EMAIL: 'email',
  PHONE: 'phone',
  ADDRESS: 'address',
  DATE_OF_BIRTH: 'date_of_birth',
  SSN: 'ssn',
  
  // Medical information
  MEDICAL_RECORD_NUMBER: 'medical_record_number',
  INSURANCE_ID: 'insurance_id',
  DIAGNOSIS: 'diagnosis',
  MEDICATION: 'medication',
  TREATMENT_NOTES: 'treatment_notes',
  THERAPY_NOTES: 'therapy_notes',
  ASSESSMENT_RESULTS: 'assessment_results',
  
  // Mental health specific
  CRISIS_NOTES: 'crisis_notes',
  SAFETY_PLAN: 'safety_plan',
  MOOD_DATA: 'mood_data',
  JOURNAL_ENTRY: 'journal_entry',
  SESSION_TRANSCRIPT: 'session_transcript',
  
  // Communication
  PRIVATE_MESSAGE: 'private_message',
  EMERGENCY_CONTACT: 'emergency_contact',
  
  // Biometric/device data
  BIOMETRIC_DATA: 'biometric_data',
  DEVICE_ID: 'device_id',
  IP_ADDRESS: 'ip_address',
} as const;

export type PHIFieldType = typeof PHI_FIELD_TYPES[keyof typeof PHI_FIELD_TYPES];

/**
 * Encrypt a field value
 */
export function encryptField(
  plaintext: string | null | undefined,
  fieldType: PHIFieldType,
  userId?: string
): EncryptedField | null {
  if (!plaintext || plaintext.trim() === '') {
    return null;
  }

  try {
    // Derive field-specific key
    const key = deriveFieldKey(fieldType, userId);
    
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher (using createCipheriv for GCM mode)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt data
    const encrypted = cipher.update(plaintext, 'utf8');
    cipher.final();
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine IV + encrypted_data + auth_tag
    const combined = Buffer.concat([iv, encrypted, tag]);
    
    return {
      data: combined.toString('base64'),
      version: 1,
      fieldType,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Field encryption failed for ${fieldType}:`, error);
    throw new Error(`Failed to encrypt ${fieldType} field`);
  }
}

/**
 * Decrypt a field value
 */
export function decryptField(
  encryptedField: EncryptedField | null | undefined,
  userId?: string
): string | null {
  if (!encryptedField?.data) {
    return null;
  }

  try {
    // Parse encrypted data
    const combined = Buffer.from(encryptedField.data, 'base64');
    
    if (combined.length < IV_LENGTH + TAG_LENGTH) {
      throw new Error('Invalid encrypted field data length');
    }
    
    // Extract components
    const iv = combined.subarray(0, IV_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, -TAG_LENGTH);
    const tag = combined.subarray(-TAG_LENGTH);
    
    // Derive field-specific key
    const key = deriveFieldKey(encryptedField.fieldType, userId);
    
    // Create decipher (using createDecipheriv for GCM mode)
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error(`Field decryption failed for ${encryptedField.fieldType}:`, error);
    throw new Error(`Failed to decrypt ${encryptedField.fieldType} field`);
  }
}

/**
 * Bulk encrypt multiple fields
 */
export function encryptFields(
  data: Record<string, any>,
  fieldMappings: Record<string, PHIFieldType>,
  userId?: string
): Record<string, any> {
  const result = { ...data };
  
  for (const [fieldName, fieldType] of Object.entries(fieldMappings)) {
    if (data[fieldName] !== undefined) {
      result[fieldName] = encryptField(data[fieldName], fieldType, userId);
    }
  }
  
  return result;
}

/**
 * Bulk decrypt multiple fields
 */
export function decryptFields(
  data: Record<string, any>,
  fieldNames: string[],
  userId?: string
): Record<string, any> {
  const result = { ...data };
  
  for (const fieldName of fieldNames) {
    if (data[fieldName] && typeof data[fieldName] === 'object' && 'data' in data[fieldName]) {
      result[fieldName] = decryptField(data[fieldName] as EncryptedField, userId);
    }
  }
  
  return result;
}

/**
 * Check if a field is encrypted
 */
export function isEncryptedField(value: any): value is EncryptedField {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.data === 'string' &&
    typeof value.version === 'number' &&
    typeof value.fieldType === 'string' &&
    typeof value.timestamp === 'string'
  );
}

/**
 * Searchable hash for encrypted fields (for database queries)
 * Uses HMAC-SHA256 with field-specific key
 */
export function createSearchableHash(
  plaintext: string,
  fieldType: PHIFieldType,
  userId?: string
): string {
  const key = deriveFieldKey(`${fieldType}:search`, userId);
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(plaintext.toLowerCase().trim());
  return hmac.digest('hex');
}

/**
 * Create searchable hash for partial matching (first N characters)
 */
export function createPartialSearchHash(
  plaintext: string,
  fieldType: PHIFieldType,
  prefixLength: number = 3,
  userId?: string
): string[] {
  const normalized = plaintext.toLowerCase().trim();
  const hashes: string[] = [];
  
  for (let i = prefixLength; i <= normalized.length; i++) {
    const prefix = normalized.substring(0, i);
    hashes.push(createSearchableHash(prefix, fieldType, userId));
  }
  
  return hashes;
}

/**
 * Utility for database models
 */
export class FieldEncryption {
  constructor(private userId?: string) {}

  /**
   * Encrypt field for database storage
   */
  encrypt(value: string | null, fieldType: PHIFieldType): EncryptedField | null {
    return encryptField(value, fieldType, this.userId);
  }

  /**
   * Decrypt field from database
   */
  decrypt(encryptedField: EncryptedField | null): string | null {
    return decryptField(encryptedField, this.userId);
  }

  /**
   * Create searchable hash
   */
  hash(value: string, fieldType: PHIFieldType): string {
    return createSearchableHash(value, fieldType, this.userId);
  }

  /**
   * Encrypt multiple fields at once
   */
  encryptMultiple(
    data: Record<string, any>,
    mappings: Record<string, PHIFieldType>
  ): Record<string, any> {
    return encryptFields(data, mappings, this.userId);
  }

  /**
   * Decrypt multiple fields at once
   */
  decryptMultiple(data: Record<string, any>, fieldNames: string[]): Record<string, any> {
    return decryptFields(data, fieldNames, this.userId);
  }
}

/**
 * Key rotation utilities
 */
export class KeyRotation {
  static async rotateFieldKey(
    oldVersion: number,
    newVersion: number,
    fieldType: PHIFieldType
  ): Promise<void> {
    // This would be implemented with database migrations
    // For now, we'll just log the rotation requirement
    console.log(`Key rotation required for ${fieldType}: v${oldVersion} -> v${newVersion}`);
    
    // In production, this would:
    // 1. Generate new key version
    // 2. Re-encrypt all fields with old version
    // 3. Update version numbers
    // 4. Securely delete old keys
  }

  static isKeyRotationRequired(encryptedField: EncryptedField): boolean {
    const currentVersion = 1; // This would come from configuration
    return encryptedField.version < currentVersion;
  }
}

/**
 * Audit logging for encryption operations
 */
export function logEncryptionAudit(
  operation: 'encrypt' | 'decrypt' | 'key_rotation',
  fieldType: PHIFieldType,
  userId?: string,
  success: boolean = true,
  error?: string
): void {
  const auditLog = {
    timestamp: new Date().toISOString(),
    operation,
    fieldType,
    userId: userId || 'system',
    success,
    error,
    // Don't log the actual data for security
  };
  
  // In production, this would go to a secure audit log system
  console.log('Encryption Audit:', JSON.stringify(auditLog));
}

// Types are already exported above as interface/type declarations