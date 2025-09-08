/**
 * Consolidated Encryption Exports
 * Central export file for all encryption utilities used throughout the codebase
 */

// Import for use in default export
import {
  encryptData,
  decryptData,
  hashIdentifier,
  sanitizeForLogging,
  generateSecureToken,
  validateEncryptedData,
  encryptField,
  decryptField
} from './encryption';

// Re-export from main encryption files
export {
  encryptData,
  decryptData,
  hashIdentifier,
  sanitizeForLogging,
  generateSecureToken,
  validateEncryptedData,
  encryptField,
  decryptField,
  type EncryptedField
} from './encryption';

export {
  encryptionService,
  encryptPHI,
  decryptPHI,
  hashPHI,
  generateToken,
  type EncryptedData,
  EncryptionService
} from './security/encryption';

// Field-level encryption utilities
export {
  encryptField as encryptFieldData,
  decryptField as decryptFieldData
} from './encryption/field-encryption';

// Additional utility functions
export function encrypt(data: any): string {
  return encryptData(data);
}

export function decrypt(encryptedData: string): any {
  return decryptData(encryptedData);
}

export function encryptJSON(data: any, key?: string): string {
  return encryptData(JSON.stringify(data));
}

export function decryptJSON(encryptedData: string, key?: string): any {
  try {
    const decrypted = decryptData(encryptedData);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Failed to decrypt JSON:', error);
    return {};
  }
}

export function maskSensitiveData(data: any): any {
  return sanitizeForLogging(data);
}

export function hash(data: string): string {
  return hashIdentifier(data);
}

export function createSecureHash(value: string): string {
  return hashIdentifier(value);
}

export function createSecureToken(length?: number): string {
  return generateSecureToken(length);
}

export function sanitizeData(data: any): any {
  return sanitizeForLogging(data);
}

export function isEncryptedDataValid(data: string): boolean {
  return validateEncryptedData(data);
}

// Type exports for comprehensive typing
export type {
  EncryptedData as SecurityEncryptedData,
  EncryptedField as EncryptionField
} from './security/encryption';

export interface EncryptionOptions {
  algorithm?: string;
  keyVersion?: number;
  includeMetadata?: boolean;
}

export interface DecryptionResult<T = any> {
  data: T;
  keyVersion: number;
  timestamp?: Date;
  isValid: boolean;
}

// Encryption utility constants
export const ENCRYPTION_ALGORITHMS = {
  AES_256_GCM: 'aes-256-gcm',
  AES_256_CBC: 'aes-256-cbc',
  CHACHA20_POLY1305: 'chacha20-poly1305'
} as const;

export const HASH_ALGORITHMS = {
  SHA256: 'sha256',
  SHA512: 'sha512',
  BLAKE2B: 'blake2b'
} as const;


// Default export for backward compatibility
const encryptionUtils = {
  encrypt: encryptData,
  decrypt: decryptData,
  hash: hashIdentifier,
  sanitize: sanitizeForLogging,
  generateToken: generateSecureToken,
  validate: validateEncryptedData,
  encryptField,
  decryptField
};

export default encryptionUtils;