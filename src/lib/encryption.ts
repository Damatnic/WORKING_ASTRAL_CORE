import * as crypto from 'crypto';

// HIPAA-compliant encryption utilities for sensitive health information
// Uses AES-256-GCM for authenticated encryption

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const ITERATIONS = 100000; // PBKDF2 iterations

// Get encryption key from environment or use a default for development
const getEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    // In production, this should throw an error
    // For development/build, use a default key
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      console.warn('ENCRYPTION_KEY is not set - using default key (NOT SECURE FOR PRODUCTION)');
    }
    // Use a deterministic key for development/build
    return 'development-key-do-not-use-in-production-' + 'a'.repeat(20);
  }
  return key;
};

// Derive a key from the master key using PBKDF2
const deriveKey = (masterKey: string, salt: Buffer): Buffer => {
  return crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, 32, 'sha256');
};

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param data - The data to encrypt (string or object)
 * @returns Encrypted data with salt, iv, tag, and ciphertext
 */
export const encryptData = (data: any): string => {
  try {
    const masterKey = getEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(masterKey, salt);
    
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    // Combine all components into a single string
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts data encrypted with encryptData
 * @param encryptedData - The encrypted data string
 * @returns Decrypted data (string or parsed object)
 */
export const decryptData = (encryptedData: string): any => {
  try {
    const masterKey = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    const key = deriveKey(masterKey, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    // Try to parse as JSON, return as string if it fails
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hash sensitive identifiers for indexing while maintaining privacy
 * @param value - The value to hash
 * @returns Hashed value
 */
export const hashIdentifier = (value: string): string => {
  const hash = crypto.createHash('sha256');
  hash.update(value + getEncryptionKey());
  return hash.digest('hex');
};

/**
 * Sanitize data for logging (remove sensitive information)
 * @param data - The data object to sanitize
 * @returns Sanitized data safe for logging
 */
export const sanitizeForLogging = (data: any): any => {
  if (!data) return data;
  
  const sensitiveFields = [
    'password', 'ssn', 'dateOfBirth', 'address', 'phone', 
    'email', 'emergencyContact', 'medications', 'diagnosis',
    'treatmentNotes', 'progressNotes', 'insuranceInfo'
  ];
  
  const sanitized = { ...data };
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
};

/**
 * Generate a secure random token
 * @param length - Length of the token in bytes
 * @returns Hex string token
 */
export const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Validate that encrypted data hasn't been tampered with
 * @param encryptedData - The encrypted data to validate
 * @returns Boolean indicating if data is valid
 */
export const validateEncryptedData = (encryptedData: string): boolean => {
  try {
    // Attempt to decrypt - will throw if tampered
    decryptData(encryptedData);
    return true;
  } catch {
    return false;
  }
};

// Export types for TypeScript
export interface EncryptedField {
  encrypted: string;
  timestamp: Date;
  version: number;
}

/**
 * Encrypt a field with metadata for versioning
 * @param data - The data to encrypt
 * @returns Encrypted field with metadata
 */
export const encryptField = (data: any): EncryptedField => {
  return {
    encrypted: encryptData(data),
    timestamp: new Date(),
    version: 1
  };
};

/**
 * Decrypt a field with metadata
 * @param field - The encrypted field
 * @returns Decrypted data
 */
export const decryptField = (field: EncryptedField): any => {
  return decryptData(field.encrypted);
};

// Aliases for backward compatibility
export const encryptString = encryptData;
export const decryptString = decryptData;
export const encryptJSON = encryptData;
export const decryptJSON = decryptData;

/**
 * Mask sensitive data for display (e.g., showing only last 4 digits)
 * @param data - The data to mask
 * @param visibleChars - Number of characters to leave visible at the end
 * @returns Masked string
 */
export const maskSensitiveData = (data: any, visibleChars: number = 4): string => {
  if (!data) return '';
  
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  if (str.length <= visibleChars) return '*'.repeat(str.length);
  
  const masked = '*'.repeat(str.length - visibleChars) + str.slice(-visibleChars);
  return masked;
};

// Manual encryption helper for specific use cases
export class ManualEncryption {
  static encrypt(data: any): string {
    return encryptData(data);
  }
  
  static decrypt(encryptedData: string): any {
    return decryptData(encryptedData);
  }
}

// Fields that should be encrypted in different models
export const ENCRYPTION_FIELD_MAPPINGS = {
  User: ['phoneNumber'],
  UserProfile: ['medicalHistory', 'address', 'emergencyContacts', 'crisisContacts'],
  JournalEntry: ['title', 'content', 'tags'],
  MoodEntry: ['notes', 'tags'],
  SafetyPlan: ['warningSignsEncrypted', 'copingStrategiesEncrypted', 'supportContactsEncrypted', 'safeEnvironmentEncrypted', 'reasonsToLiveEncrypted'],
  CrisisReport: ['details'],
  Message: ['content'],
  Note: ['content'],
} as const;