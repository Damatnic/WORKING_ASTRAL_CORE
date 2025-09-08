/**
 * Cache Utilities - Ultra Simplified for TypeScript Compliance
 */

// @ts-ignore
import { createHash, createHmac, randomBytes } from 'crypto';
// @ts-ignore
import zlib from 'zlib';
// @ts-ignore
import { promisify } from 'util';

class CacheKeyUtils {
  private static readonly KEY_SEPARATOR = ':';
  private static readonly MAX_KEY_LENGTH = 250;
  private static readonly FORBIDDEN_CHARS = /[\s\r\n\t]/g;
  
  static generateKey(namespace: string, identifier: string, ...additionalParts: string[]): string {
    const parts = [namespace, identifier, ...additionalParts].filter(Boolean).map((part: any) => part.replace(this.FORBIDDEN_CHARS, '_'));
    const baseKey = parts.join(this.KEY_SEPARATOR);
    
    if (baseKey.length > this.MAX_KEY_LENGTH) {
      const hash = createHash('sha256').update(baseKey).digest('hex').substring(0, 16);
      return `${parts[0]}${this.KEY_SEPARATOR}${hash}`;
    }
    
    return baseKey;
  }
  
  static generateUserKey(namespace: string, userId: string, resource: string, ...additionalParts: string[]): string {
    return this.generateKey(namespace, `user:${userId}`, resource, ...additionalParts);
  }
  
  static generateTimeBasedKey(namespace: string, identifier: string, timeGranularity: string): string {
    const now = new Date();
    const timePart = now.toISOString().split('T')[0];
    return this.generateKey(namespace, identifier, timePart);
  }
  
  static generateExpiringKey(namespace: string, identifier: string, expirationMinutes: number): string {
    const expirationTime = Date.now() + expirationMinutes * 60000;
    const expirationPart = Math.floor(expirationTime / (expirationMinutes * 60000));
    return this.generateKey(namespace, identifier, `exp:${expirationPart}`);
  }
  
  static generateSecureKey(namespace: string, identifier: string, secret: string = 'default-secret'): string {
    const baseKey = this.generateKey(namespace, identifier);
    const signature = createHmac('sha256', secret).update(baseKey).digest('hex').substring(0, 8);
    return `${baseKey}:sig:${signature}`;
  }
  
  static validateKey(key: string): boolean {
    return !(!key || key.length === 0 || key.length > this.MAX_KEY_LENGTH || this.FORBIDDEN_CHARS.test(key));
  }
  
  static extractNamespace(key: string): string | null {
    const parts = key.split(this.KEY_SEPARATOR);
    return parts.length > 0 ? parts[0] : null;
  }
  
  static parseKey(key: string): { namespace: string; identifier: string; additionalParts: string[]; } | null {
    const parts = key.split(this.KEY_SEPARATOR);
    return parts.length < 2 ? null : {
      namespace: parts[0] || '',
      identifier: parts[1] || '',
      additionalParts: parts.slice(2),
    };
  }
}

class SerializationUtils {
  static serialize<T>(data: T, options: any = {}): string {
    const payload = { data, ...(options.includeMetadata && { metadata: { timestamp: Date.now(), type: typeof data, version: '1.0' } }) };
    return JSON.stringify(payload);
  }
  
  static deserialize<T>(serialized: string, expectedType?: string): { data: T; metadata?: any } | null {
    try {
      const parsed = JSON.parse(serialized);
      return parsed.hasOwnProperty('data') ? { data: parsed.data as T, metadata: parsed.metadata } : { data: parsed as T };
    } catch (error: any) {
      console.error('[SerializationUtils] Deserialization error:', error);
      return null;
    }
  }
  
  static serializeWithSchema<T>(data: T, schema: any): string | null {
    if (schema.type === 'object' && typeof data !== 'object') {
      console.error('[SerializationUtils] Schema validation failed: expected object');
      return null;
    }
    return this.serialize(data, { includeMetadata: true });
  }
  
  static getSerializedSize(data: any): number {
    const serialized = this.serialize(data);
    return Buffer.byteLength(serialized, 'utf8');
  }
}

class CompressionUtils {
  private static readonly COMPRESSION_THRESHOLD = 1024;
  
  static async compressGzip(data: string | Buffer): Promise<string> {
    try {
      const input = typeof data === 'string' ? Buffer.from(data) : data;
      const gzip = promisify(zlib.gzip);
      const compressed = await gzip(input);
      return compressed.toString('base64');
    } catch (error: any) {
      console.error('[CompressionUtils] Gzip compression error:', error);
      throw new Error('Gzip compression failed');
    }
  }
  
  static async decompressGzip(compressedData: string): Promise<string> {
    try {
      const buffer = Buffer.from(compressedData, 'base64');
      const gunzip = promisify(zlib.gunzip);
      const decompressed = await gunzip(buffer);
      return decompressed.toString();
    } catch (error: any) {
      console.error('[CompressionUtils] Gzip decompression error:', error);
      throw new Error('Gzip decompression failed');
    }
  }
  
  static calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    return originalSize === 0 ? 0 : ((originalSize - compressedSize) / originalSize) * 100;
  }
}

class CacheTagging {
  private static readonly TAG_PREFIX = 'tag:';
  private static readonly TAG_SEPARATOR = '|';
  
  static generateTaggedKey(baseKey: string, tags: string[]): string {
    if (!tags.length) return baseKey;
    const tagString = tags.sort().join(this.TAG_SEPARATOR);
    const tagHash = createHash('sha256').update(tagString).digest('hex').substring(0, 8);
    return `${baseKey}:${this.TAG_PREFIX}${tagHash}`;
  }
  
  static extractTagHash(taggedKey: string): string | null {
    const tagPrefixIndex = taggedKey.lastIndexOf(`:${this.TAG_PREFIX}`);
    return tagPrefixIndex === -1 ? null : taggedKey.substring(tagPrefixIndex + this.TAG_PREFIX.length + 1);
  }
}

class CacheWarmingUtils {
  static async warmWithBatch<T>(cacheInstance: any, cacheType: string, batchData: Map<string, T>, options: any = {}): Promise<void> {
    const batchSize = options.batchSize || 50;
    const delay = options.delayBetweenBatches || 100;
    const entries = Array.from(batchData.entries());
    
    for (let i = 0; i < entries.length; i += batchSize) {
      try {
        const batch = entries.slice(i, i + batchSize);
        if (cacheInstance?.batchSet) await cacheInstance.batchSet(cacheType, new Map(batch), options.ttl);
        if (delay && i + batchSize < entries.length) await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error: any) {
        console.error(`[CacheWarmingUtils] Batch ${Math.floor(i/batchSize) + 1} failed:`, error);
      }
    }
  }
}

class CachePerformanceUtils {
  private static performanceData: Map<string, any> = new Map();
  
  static async measureOperation<T>(operationName: string, operation: () => Promise<T>): Promise<any> {
    const startTime = Date.now();
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      this.recordPerformance(operationName, duration, true);
      return { result, duration, success: true };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.recordPerformance(operationName, duration, false);
      throw error;
    }
  }
  
  static recordPerformance(operationName: string, duration: number, success: boolean): void {
    if (!this.performanceData.has(operationName)) {
      this.performanceData.set(operationName, { totalTime: 0, callCount: 0, errors: 0 });
    }
    
    const data = this.performanceData.get(operationName)!;
    data.totalTime += duration;
    data.callCount += 1;
    if (!success) data.errors += 1;
  }
}

class HIPAACacheUtils {
  private static readonly SENSITIVE_FIELDS = new Set(['ssn', 'socialSecurityNumber', 'dateOfBirth', 'dob', 'address', 'phoneNumber', 'phone', 'email', 'emergencyContact', 'medicalRecordNumber', 'insuranceNumber']);
  
  static sanitizeForCache(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    if (Array.isArray(data)) return data.map((item: any) => this.sanitizeForCache(item));
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (this.SENSITIVE_FIELDS.has(lowerKey)) {
        sanitized[key] = typeof value === 'string' ? this.maskSensitiveValue(value) : '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeForCache(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
  
  private static maskSensitiveValue(value: string): string {
    if (value.length <= 4) return '****';
    const visibleChars = 2;
    const maskedChars = '*'.repeat(value.length - visibleChars * 2);
    return value.substring(0, visibleChars) + maskedChars + value.substring(value.length - visibleChars);
  }
}

export { CacheKeyUtils, SerializationUtils, CompressionUtils, CacheTagging, CacheWarmingUtils, CachePerformanceUtils, HIPAACacheUtils };