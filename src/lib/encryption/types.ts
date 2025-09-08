/**
 * Encryption Type Definitions
 * Centralizes all encryption-related type exports
 */

// Re-export types from field-encryption
export type { PHIFieldType, EncryptedField } from './field-encryption';
export { PHI_FIELD_TYPES } from './field-encryption';

// Additional encryption-related types
export interface EncryptionMetadata {
  algorithm: string;
  keyVersion: number;
  timestamp: Date;
  fieldType?: string;
}

export interface DecryptionOptions {
  validateIntegrity?: boolean;
  fallbackToPlaintext?: boolean;
  logFailures?: boolean;
}

export interface EncryptionOptions {
  algorithm?: string;
  keyVersion?: number;
  includeMetadata?: boolean;
  fieldType?: PHIFieldType;
}

// Error types for encryption operations
export class EncryptionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export class DecryptionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

export class KeyManagementError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'KeyManagementError';
  }
}