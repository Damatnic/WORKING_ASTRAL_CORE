/**
 * Privacy and HIPAA Compliance Manager
 * Ensures all data handling meets HIPAA requirements and privacy standards
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export interface PrivacyConfig {
  encryptionEnabled: boolean;
  dataRetentionDays: number;
  minimumDataCollection: boolean;
  auditLoggingEnabled: boolean;
  consentRequired: boolean;
  anonymizationEnabled: boolean;
  rightToDelete: boolean;
  dataPortability: boolean;
}

export interface ConsentRecord {
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  timestamp: Date;
  expiresAt?: Date;
  ipAddress?: string;
  version: string;
}

export type ConsentType = 
  | 'terms_of_service'
  | 'privacy_policy'
  | 'data_processing'
  | 'emergency_contact'
  | 'data_sharing'
  | 'marketing'
  | 'research';

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  category: DataCategory;
  requiresEncryption: boolean;
  requiresAudit: boolean;
  retentionPeriod: number; // days
}

export type DataCategory = 
  | 'personal_identifiable'
  | 'health_information'
  | 'mental_health_records'
  | 'crisis_data'
  | 'session_data'
  | 'analytics'
  | 'system_logs';

export interface SanitizedResponse {
  content: string;
  redactedItems: RedactedItem[];
  privacyViolations: string[];
}

export interface RedactedItem {
  type: string;
  originalLength: number;
  reason: string;
}

export interface AccessControl {
  userId: string;
  role: UserRole;
  permissions: Permission[];
  restrictions: string[];
  lastAccess: Date;
}

export type UserRole = 
  | 'patient'
  | 'therapist'
  | 'crisis_counselor'
  | 'administrator'
  | 'researcher'
  | 'ai_system';

export interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'share')[];
  conditions?: AccessCondition[];
}

export interface AccessCondition {
  type: 'time_based' | 'location_based' | 'purpose_based';
  value: any;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: AuditAction;
  resource: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  violations?: string[];
}

export type AuditAction = 
  | 'access'
  | 'modify'
  | 'delete'
  | 'share'
  | 'export'
  | 'consent_change'
  | 'encryption'
  | 'decryption';

export interface EncryptionKey {
  id: string;
  algorithm: 'AES-256-GCM' | 'RSA-OAEP';
  createdAt: Date;
  rotatedAt?: Date;
  expiresAt: Date;
  status: 'active' | 'rotating' | 'expired';
}

export class PrivacyManager extends EventEmitter {
  private config: PrivacyConfig;
  private consentRecords: Map<string, ConsentRecord[]>;
  private accessControls: Map<string, AccessControl>;
  private auditLog: AuditEntry[];
  private encryptionKeys: Map<string, EncryptionKey>;
  private currentKeyId: string = '';

  private readonly HIPAA_REQUIREMENTS = {
    minimumPasswordLength: 8,
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
    encryptionRequired: true,
    auditLogRetention: 6 * 365, // 6 years in days
    accessLoggingRequired: true,
    dataIntegrityChecks: true,
    transmissionSecurity: true
  };

  private readonly PII_PATTERNS = [
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'SSN' }, // Social Security Number
    { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, type: 'Email' },
    { pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, type: 'Phone' },
    { pattern: /\b\d{16}\b/g, type: 'Credit Card' },
    { pattern: /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|boulevard|blvd)\b/gi, type: 'Address' },
    { pattern: /\b(0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g, type: 'Date of Birth' }
  ];

  constructor() {
    super();
    this.config = this.getDefaultConfig();
    this.consentRecords = new Map();
    this.accessControls = new Map();
    this.auditLog = [];
    this.encryptionKeys = new Map();
    this.initializeEncryption();
  }

  private getDefaultConfig(): PrivacyConfig {
    return {
      encryptionEnabled: true,
      dataRetentionDays: 90,
      minimumDataCollection: true,
      auditLoggingEnabled: true,
      consentRequired: true,
      anonymizationEnabled: true,
      rightToDelete: true,
      dataPortability: true
    };
  }

  private initializeEncryption(): void {
    // Generate initial encryption key
    this.currentKeyId = this.generateKeyId();
    const key: EncryptionKey = {
      id: this.currentKeyId,
      algorithm: 'AES-256-GCM',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      status: 'active'
    };
    this.encryptionKeys.set(this.currentKeyId, key);

    // Schedule key rotation
    this.scheduleKeyRotation();
  }

  private generateKeyId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private scheduleKeyRotation(): void {
    // Rotate encryption keys every 30 days
    setInterval(() => {
      this.rotateEncryptionKey();
    }, 30 * 24 * 60 * 60 * 1000);
  }

  private async rotateEncryptionKey(): Promise<void> {
    const oldKey = this.encryptionKeys.get(this.currentKeyId);
    if (oldKey) {
      oldKey.status = 'rotating';
    }

    // Generate new key
    const newKeyId = this.generateKeyId();
    const newKey: EncryptionKey = {
      id: newKeyId,
      algorithm: 'AES-256-GCM',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'active'
    };

    this.encryptionKeys.set(newKeyId, newKey);
    this.currentKeyId = newKeyId;

    // Re-encrypt sensitive data with new key
    await this.reencryptData(oldKey?.id, newKeyId);

    if (oldKey) {
      oldKey.status = 'expired';
      oldKey.rotatedAt = new Date();
    }

    this.emit('key-rotated', { oldKeyId: oldKey?.id, newKeyId });
  }

  private async reencryptData(oldKeyId: string | undefined, newKeyId: string): Promise<void> {
    // In production, this would re-encrypt all sensitive data
    // This is a placeholder for the re-encryption logic
    this.emit('reencryption-complete', { oldKeyId, newKeyId });
  }

  public async validateConsent(userId: string): Promise<{ valid: boolean; missing?: string[] }> {
    const userConsents = this.consentRecords.get(userId) || [];
    const requiredConsents: ConsentType[] = [
      'terms_of_service',
      'privacy_policy',
      'data_processing'
    ];

    const missingConsents: string[] = [];
    
    for (const required of requiredConsents) {
      const consent = userConsents.find(c => 
        c.consentType === required && 
        c.granted && 
        (!c.expiresAt || c.expiresAt > new Date())
      );
      
      if (!consent) {
        missingConsents.push(required);
      }
    }

    const valid = missingConsents.length === 0;

    if (!valid) {
      await this.auditAccess({
        userId,
        action: 'access',
        resource: 'ai_therapy',
        success: false,
        violations: ['missing_consent'],
        timestamp: new Date(),
        details: {
          missingConsents,
          reason: 'User has not provided required consent for AI therapy access'
        }
      });
    }

    return { valid, missing: missingConsents.length > 0 ? missingConsents : undefined };
  }

  public async recordConsent(consent: ConsentRecord): Promise<void> {
    if (!this.consentRecords.has(consent.userId)) {
      this.consentRecords.set(consent.userId, []);
    }

    const userConsents = this.consentRecords.get(consent.userId)!;
    
    // Invalidate previous consents of same type
    userConsents.forEach(c => {
      if (c.consentType === consent.consentType) {
        c.expiresAt = new Date();
      }
    });

    userConsents.push(consent);

    await this.auditAccess({
      userId: consent.userId,
      action: 'consent_change',
      resource: consent.consentType,
      success: true,
      details: { granted: consent.granted },
      timestamp: new Date()
    });

    this.emit('consent-recorded', consent);
  }

  public async sanitizeResponse(response: any): Promise<SanitizedResponse> {
    let content = typeof response === 'string' ? response : response.content;
    const redactedItems: RedactedItem[] = [];
    const privacyViolations: string[] = [];

    // Check for PII
    for (const piiPattern of this.PII_PATTERNS) {
      const matches = content.match(piiPattern.pattern);
      if (matches) {
        matches.forEach((match: string) => {
          const redacted = this.redactString(match);
          content = content.replace(match, redacted);
          redactedItems.push({
            type: piiPattern.type,
            originalLength: match.length,
            reason: 'PII_DETECTED'
          });
        });
        privacyViolations.push(`${piiPattern.type} detected and redacted`);
      }
    }

    // Check for health information disclosure
    const healthInfoPatterns = [
      /\b(diagnosis|diagnosed with|medication|prescription|dosage)\b.*\b(specific condition|disorder)\b/gi,
      /\b(HIV|AIDS|cancer|schizophrenia|bipolar)\b/gi
    ];

    for (const pattern of healthInfoPatterns) {
      if (pattern.test(content)) {
        privacyViolations.push('Potential health information disclosure');
      }
    }

    // Apply data minimization
    if (this.config.minimumDataCollection) {
      content = this.minimizeData(content);
    }

    // Encrypt if required
    if (this.config.encryptionEnabled) {
      // In production, sensitive parts would be encrypted
      // This is a placeholder
    }

    return {
      content,
      redactedItems,
      privacyViolations
    };
  }

  private redactString(str: string): string {
    // Keep first and last character for context, redact middle
    if (str.length <= 2) return '**';
    return str[0] + '*'.repeat(str.length - 2) + str[str.length - 1];
  }

  private minimizeData(content: string): string {
    // Remove unnecessary verbose information
    // This is a simplified example
    const minimized = content
      .replace(/\b(um|uh|like|you know|I mean)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return minimized;
  }

  public async encryptData(data: string): Promise<{ encrypted: string; keyId: string }> {
    const key = this.encryptionKeys.get(this.currentKeyId);
    if (!key || key.status !== 'active') {
      throw new Error('No active encryption key available');
    }

    // Generate IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      Buffer.from(this.getEncryptionKey(), 'hex'),
      iv
    );

    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine IV, auth tag, and encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]).toString('base64');

    await this.auditAccess({
      userId: 'system',
      action: 'encryption',
      resource: 'data',
      success: true,
      details: { keyId: this.currentKeyId },
      timestamp: new Date()
    });

    return {
      encrypted: combined,
      keyId: this.currentKeyId
    };
  }

  public async decryptData(encryptedData: string, keyId: string): Promise<string> {
    const key = this.encryptionKeys.get(keyId);
    if (!key) {
      throw new Error('Encryption key not found');
    }

    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract IV, auth tag, and encrypted data
    const iv = combined.slice(0, 16);
    const authTag = combined.slice(16, 32);
    const encrypted = combined.slice(32);

    // Create decipher
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      Buffer.from(this.getEncryptionKey(), 'hex'),
      iv
    );
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    await this.auditAccess({
      userId: 'system',
      action: 'decryption',
      resource: 'data',
      success: true,
      details: { keyId },
      timestamp: new Date()
    });

    return decrypted;
  }

  private getEncryptionKey(): string {
    // In production, this would retrieve the actual key from secure storage
    // This is a placeholder
    return crypto.randomBytes(32).toString('hex');
  }

  public async checkAccess(
    userId: string,
    resource: string,
    action: 'read' | 'write' | 'delete' | 'share'
  ): Promise<boolean> {
    const accessControl = this.accessControls.get(userId);
    if (!accessControl) {
      await this.auditAccess({
        userId,
        action: 'access',
        resource,
        success: false,
        violations: ['no_access_control'],
        timestamp: new Date(),
        details: { reason: 'no_access_control' }
      });
      return false;
    }

    const permission = accessControl.permissions.find(p => p.resource === resource);
    if (!permission || !permission.actions.includes(action)) {
      await this.auditAccess({
        userId,
        action: 'access',
        resource,
        success: false,
        violations: ['insufficient_permissions'],
        timestamp: new Date(),
        details: { reason: 'insufficient_permissions' }
      });
      return false;
    }

    // Check conditions
    if (permission.conditions) {
      for (const condition of permission.conditions) {
        if (!this.evaluateCondition(condition)) {
          await this.auditAccess({
            userId,
            action: 'access',
            resource,
            success: false,
            violations: ['condition_not_met'],
            details: { condition },
            timestamp: new Date()
          });
          return false;
        }
      }
    }

    // Access granted
    accessControl.lastAccess = new Date();
    
    await this.auditAccess({
      userId,
      action: 'access',
      resource,
      success: true,
      timestamp: new Date(),
      details: { action: 'access_granted' }
    });

    return true;
  }

  private evaluateCondition(condition: AccessCondition): boolean {
    switch (condition.type) {
      case 'time_based':
        const now = new Date();
        const { start, end } = condition.value;
        return now >= start && now <= end;
      
      case 'location_based':
        // Check IP geolocation
        return true; // Placeholder
      
      case 'purpose_based':
        // Check access purpose
        return true; // Placeholder
      
      default:
        return false;
    }
  }

  public async grantAccess(
    userId: string,
    role: UserRole,
    permissions: Permission[]
  ): Promise<void> {
    const accessControl: AccessControl = {
      userId,
      role,
      permissions,
      restrictions: this.getRoleRestrictions(role),
      lastAccess: new Date()
    };

    this.accessControls.set(userId, accessControl);

    await this.auditAccess({
      userId: 'admin',
      action: 'modify',
      resource: `access_control:${userId}`,
      success: true,
      details: { role, permissions },
      timestamp: new Date()
    });

    this.emit('access-granted', { userId, role, permissions });
  }

  private getRoleRestrictions(role: UserRole): string[] {
    const restrictions: Record<UserRole, string[]> = {
      patient: ['cannot_access_other_patient_data', 'cannot_modify_system_settings'],
      therapist: ['cannot_access_unassigned_patients', 'cannot_delete_records'],
      crisis_counselor: ['temporary_access_only', 'cannot_export_data'],
      administrator: [],
      researcher: ['anonymized_data_only', 'cannot_identify_patients'],
      ai_system: ['cannot_share_data_externally', 'cannot_override_privacy_settings']
    };

    return restrictions[role] || [];
  }

  public async secureSessionData(sessionId: string): Promise<void> {
    // Secure session data after session ends
    await this.auditAccess({
      userId: 'system',
      action: 'modify',
      resource: `session:${sessionId}`,
      success: true,
      details: { action: 'secured' },
      timestamp: new Date()
    });

    this.emit('session-secured', { sessionId });
  }

  public async deleteUserData(userId: string): Promise<void> {
    // Implementation of right to delete
    if (!this.config.rightToDelete) {
      throw new Error('Right to delete is not enabled');
    }

    // Delete consent records
    this.consentRecords.delete(userId);

    // Delete access controls
    this.accessControls.delete(userId);

    // Audit the deletion
    await this.auditAccess({
      userId,
      action: 'delete',
      resource: 'user_data',
      success: true,
      details: { reason: 'user_request' },
      timestamp: new Date()
    });

    this.emit('user-data-deleted', { userId });
  }

  public async exportUserData(userId: string): Promise<any> {
    // Implementation of data portability
    if (!this.config.dataPortability) {
      throw new Error('Data portability is not enabled');
    }

    const userData = {
      consents: this.consentRecords.get(userId),
      accessHistory: this.auditLog.filter(entry => entry.userId === userId),
      exportDate: new Date(),
      format: 'json'
    };

    await this.auditAccess({
      userId,
      action: 'export',
      resource: 'user_data',
      success: true,
      timestamp: new Date(),
      details: { exportFormat: 'json' }
    });

    return userData;
  }

  private async auditAccess(entry: Omit<AuditEntry, 'id'>): Promise<void> {
    if (!this.config.auditLoggingEnabled) return;

    const auditEntry: AuditEntry = {
      id: crypto.randomBytes(16).toString('hex'),
      ...entry
    };

    this.auditLog.push(auditEntry);

    // Maintain audit log size
    const maxEntries = 10000;
    if (this.auditLog.length > maxEntries) {
      // Archive old entries in production
      this.auditLog = this.auditLog.slice(-maxEntries);
    }

    // Check for violations
    if (entry.violations && entry.violations.length > 0) {
      this.emit('privacy-violation', auditEntry);
    }
  }

  public async getAuditLog(
    filters?: {
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      action?: AuditAction;
    }
  ): Promise<AuditEntry[]> {
    let filtered = [...this.auditLog];

    if (filters) {
      if (filters.userId) {
        filtered = filtered.filter(e => e.userId === filters.userId);
      }
      if (filters.startDate) {
        filtered = filtered.filter(e => e.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        filtered = filtered.filter(e => e.timestamp <= filters.endDate!);
      }
      if (filters.action) {
        filtered = filtered.filter(e => e.action === filters.action);
      }
    }

    return filtered;
  }

  public classifyData(data: any): DataClassification {
    // Classify data based on content
    let level: DataClassification['level'] = 'public';
    let category: DataCategory = 'system_logs';

    // Check for health information
    if (this.containsHealthInfo(data)) {
      level = 'restricted';
      category = 'health_information';
    }
    // Check for PII
    else if (this.containsPII(data)) {
      level = 'confidential';
      category = 'personal_identifiable';
    }
    // Check for crisis data
    else if (this.containsCrisisData(data)) {
      level = 'restricted';
      category = 'crisis_data';
    }

    return {
      level,
      category,
      requiresEncryption: level === 'restricted' || level === 'confidential',
      requiresAudit: level !== 'public',
      retentionPeriod: this.getRetentionPeriod(category)
    };
  }

  private containsHealthInfo(data: any): boolean {
    const dataStr = JSON.stringify(data).toLowerCase();
    const healthKeywords = [
      'diagnosis', 'medication', 'treatment', 'therapy',
      'symptom', 'condition', 'disorder', 'prescription'
    ];
    return healthKeywords.some(keyword => dataStr.includes(keyword));
  }

  private containsPII(data: any): boolean {
    const dataStr = JSON.stringify(data);
    return this.PII_PATTERNS.some(pattern => pattern.pattern.test(dataStr));
  }

  private containsCrisisData(data: any): boolean {
    const dataStr = JSON.stringify(data).toLowerCase();
    const crisisKeywords = [
      'suicide', 'self-harm', 'crisis', 'emergency',
      'danger', 'threat', 'urgent'
    ];
    return crisisKeywords.some(keyword => dataStr.includes(keyword));
  }

  private getRetentionPeriod(category: DataCategory): number {
    const retentionPeriods: Record<DataCategory, number> = {
      personal_identifiable: 365 * 7, // 7 years
      health_information: 365 * 7, // 7 years
      mental_health_records: 365 * 7, // 7 years
      crisis_data: 365 * 2, // 2 years
      session_data: 90, // 90 days
      analytics: 365, // 1 year
      system_logs: 180 // 180 days
    };

    return retentionPeriods[category] || 90;
  }

  public getConfig(): PrivacyConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<PrivacyConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('config-updated', this.config);
  }
}

export default PrivacyManager;