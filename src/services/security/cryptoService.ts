import * as crypto from 'crypto';
// Conditionally import bcrypt and crypto-js only if available
let bcrypt: any;
try {
  bcrypt = require('bcryptjs');
} catch (e) {
  console.warn('bcryptjs not available, using crypto.pbkdf2 instead');
}

let CryptoJS: any;
try {
  CryptoJS = require('crypto-js');
} catch (e) {
  console.warn('crypto-js not available, using native crypto instead');
}

/**
 * Comprehensive cryptographic service for mental health application
 * Provides secure encryption, hashing, and data protection methods
 * Compliant with HIPAA security requirements
 */

// Encryption algorithms and configurations
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const HASH_ALGORITHM = 'sha256';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

// Security constants
const SALT_ROUNDS = 12;
const TOKEN_LENGTH = 32;

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  tag: string;
  timestamp: number;
}

export interface DecryptionOptions {
  encryptedData: string;
  iv: string;
  tag: string;
  key: string;
}

export interface HashResult {
  hash: string;
  salt: string;
  algorithm: string;
  timestamp: number;
}

/**
 * Cryptographic service for secure data handling
 */
class CryptoService {
  private readonly masterKey: string;

  constructor() {
    // In production, this should come from a secure key management service
    this.masterKey = process.env.CRYPTO_MASTER_KEY || this.generateSecureKey();
    
    if (!process.env.CRYPTO_MASTER_KEY) {
      console.warn('CRYPTO_MASTER_KEY not set. Using generated key - this is not suitable for production.');
    }
  }

  /**
   * Generate a cryptographically secure random key
   */
  generateSecureKey(length: number = KEY_LENGTH): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure random token
   */
  generateToken(length: number = TOKEN_LENGTH): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure token - alias for generateToken
   */
  generateSecureToken(length: number = TOKEN_LENGTH): string {
    return this.generateToken(length);
  }

  /**
   * Generate a secure random salt
   */
  generateSalt(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   * Used for PHI (Protected Health Information) and PII encryption
   */
  encrypt(data: string, key?: string): EncryptionResult {
    try {
      const encryptionKey = key ? Buffer.from(key, 'hex') : Buffer.from(this.masterKey, 'hex');
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data encrypted with AES-256-GCM
   */
  decrypt(options: DecryptionOptions): string {
    try {
      const key = Buffer.from(options.key, 'hex');
      const iv = Buffer.from(options.iv, 'hex');
      const tag = Buffer.from(options.tag, 'hex');
      
      const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(options.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash passwords using bcrypt (OWASP recommended) or pbkdf2 as fallback
   */
  async hashPassword(password: string): Promise<string> {
    try {
      if (bcrypt) {
        return await bcrypt.hash(password, SALT_ROUNDS);
      } else {
        // Fallback to pbkdf2 if bcrypt is not available
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return `pbkdf2$${salt}$${hash}`;
      }
    } catch (error) {
      console.error('Password hashing failed:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      if (bcrypt && !hash.startsWith('pbkdf2$')) {
        return await bcrypt.compare(password, hash);
      } else if (hash.startsWith('pbkdf2$')) {
        // Handle pbkdf2 hashes
        const [, salt, storedHash] = hash.split('$');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(verifyHash));
      }
      return false;
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }

  /**
   * Create HMAC signature for data integrity
   */
  createHMAC(data: string, key?: string): string {
    try {
      const hmacKey = key || this.masterKey;
      return crypto.createHmac(HASH_ALGORITHM, hmacKey).update(data).digest('hex');
    } catch (error) {
      console.error('HMAC creation failed:', error);
      throw new Error('Failed to create HMAC');
    }
  }

  /**
   * Verify HMAC signature
   */
  verifyHMAC(data: string, signature: string, key?: string): boolean {
    try {
      const expectedSignature = this.createHMAC(data, key);
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('HMAC verification failed:', error);
      return false;
    }
  }

  /**
   * Create secure hash with salt
   */
  hashWithSalt(data: string, salt?: string): HashResult {
    try {
      const actualSalt = salt || this.generateSalt();
      const hash = crypto.createHash(HASH_ALGORITHM);
      hash.update(data + actualSalt);
      
      return {
        hash: hash.digest('hex'),
        salt: actualSalt,
        algorithm: HASH_ALGORITHM,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Hash with salt failed:', error);
      throw new Error('Failed to create hash with salt');
    }
  }

  /**
   * Verify data against hash with salt
   */
  verifyHash(data: string, hashResult: HashResult): boolean {
    try {
      const newHash = this.hashWithSalt(data, hashResult.salt);
      return crypto.timingSafeEqual(
        Buffer.from(hashResult.hash, 'hex'),
        Buffer.from(newHash.hash, 'hex')
      );
    } catch (error) {
      console.error('Hash verification failed:', error);
      return false;
    }
  }

  /**
   * Encrypt file buffer for secure storage
   */
  encryptBuffer(buffer: Buffer, key?: string): EncryptionResult {
    const data = buffer.toString('base64');
    return this.encrypt(data, key);
  }

  /**
   * Decrypt file buffer
   */
  decryptBuffer(options: DecryptionOptions): Buffer {
    const decryptedData = this.decrypt(options);
    return Buffer.from(decryptedData, 'base64');
  }

  /**
   * Mask sensitive data for logging (HIPAA compliant)
   */
  maskSensitiveData(data: string, maskChar: string = '*', visibleChars: number = 4): string {
    if (!data || data.length <= visibleChars * 2) {
      return maskChar.repeat(8); // Always return same length mask
    }
    
    const start = data.substring(0, visibleChars);
    const end = data.substring(data.length - visibleChars);
    const maskLength = Math.max(4, data.length - (visibleChars * 2));
    
    return start + maskChar.repeat(maskLength) + end;
  }

  /**
   * Generate session token with expiration
   */
  generateSessionToken(): { token: string; expiresAt: Date } {
    const token = this.generateToken(32);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration
    
    return { token, expiresAt };
  }

  /**
   * Generate API key for external integrations
   */
  generateAPIKey(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `ak_${timestamp}_${randomBytes}`;
  }

  /**
   * Encrypt JSON object
   */
  encryptJSON(obj: any, key?: string): EncryptionResult {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString, key);
  }

  /**
   * Decrypt JSON object
   */
  decryptJSON(options: DecryptionOptions): any {
    const decryptedString = this.decrypt(options);
    return JSON.parse(decryptedString);
  }

  /**
   * Create deterministic hash for data deduplication (while preserving privacy)
   */
  createDeterministicHash(data: string, context: string): string {
    // Use HMAC with context as key for deterministic but secure hashing
    return crypto.createHmac('sha256', context).update(data).digest('hex');
  }

  /**
   * Secure random number generation
   */
  generateSecureRandomNumber(min: number = 0, max: number = 100): number {
    const range = max - min + 1;
    const bytes = Math.ceil(Math.log2(range) / 8);
    const maxValidValue = Math.floor(256 ** bytes / range) * range - 1;
    
    let randomValue;
    do {
      const randomBytes = crypto.randomBytes(bytes);
      randomValue = randomBytes.readUIntBE(0, bytes);
    } while (randomValue > maxValidValue);
    
    return min + (randomValue % range);
  }

  /**
   * Time-safe string comparison to prevent timing attacks
   */
  timingSafeEqual(a: string, b: string): boolean {
    try {
      if (a.length !== b.length) {
        // Still perform operation to prevent timing analysis
        crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
        return false;
      }
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch (error) {
      return false;
    }
  }

  /**
   * Encrypt individual field data for database storage
   * @param value - The field value to encrypt
   * @param key - Optional encryption key
   * @returns Encrypted field data
   */
  encryptField(value: any, key?: string): EncryptionResult {
    const dataToEncrypt = typeof value === 'string' ? value : JSON.stringify(value);
    return this.encrypt(dataToEncrypt, key);
  }

  /**
   * Decrypt individual field data from database
   * @param encryptedField - The encrypted field data
   * @param key - Optional decryption key
   * @returns Decrypted field value
   */
  decryptField(encryptedField: EncryptionResult, key?: string): any {
    const decryptionKey = key || this.masterKey;
    const decryptedData = this.decrypt({
      encryptedData: encryptedField.encryptedData,
      iv: encryptedField.iv,
      tag: encryptedField.tag,
      key: decryptionKey
    });
    
    // Try to parse as JSON, return as string if it fails
    try {
      return JSON.parse(decryptedData);
    } catch {
      return decryptedData;
    }
  }

  /**
   * Simple hash function for data hashing needs
   * @param data - Data to hash
   * @param algorithm - Hash algorithm to use
   * @returns Hash string
   */
  hash(data: string, algorithm: string = HASH_ALGORITHM): string {
    try {
      return crypto.createHash(algorithm).update(data).digest('hex');
    } catch (error) {
      console.error('Hash creation failed:', error);
      throw new Error('Failed to create hash');
    }
  }

  /**
   * Secure comparison of two strings using timing-safe comparison
   * @param a - First string
   * @param b - Second string
   * @returns Boolean indicating if strings are equal
   */
  secureCompare(a: string, b: string): boolean {
    return this.timingSafeEqual(a, b);
  }

  /**
   * Encrypt an entire object for secure storage
   * @param obj - Object to encrypt
   * @param key - Optional encryption key
   * @returns Encrypted object data
   */
  encryptObject(obj: any, key?: string): EncryptionResult {
    try {
      const jsonString = JSON.stringify(obj);
      return this.encrypt(jsonString, key);
    } catch (error) {
      console.error('Object encryption failed:', error);
      throw new Error('Failed to encrypt object');
    }
  }

  /**
   * Decrypt an encrypted object
   * @param encryptedObject - Encrypted object data
   * @param key - Optional decryption key
   * @returns Decrypted object
   */
  decryptObject(encryptedObject: EncryptionResult, key?: string): any {
    try {
      const decryptionKey = key || this.masterKey;
      const decryptedString = this.decrypt({
        encryptedData: encryptedObject.encryptedData,
        iv: encryptedObject.iv,
        tag: encryptedObject.tag,
        key: decryptionKey
      });
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('Object decryption failed:', error);
      throw new Error('Failed to decrypt object');
    }
  }
}

// Export singleton instance
export const cryptoService = new CryptoService();
export default cryptoService;