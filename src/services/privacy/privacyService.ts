/**
 * Privacy Protection Service
 * Implements privacy-by-design principles and data protection controls
 * Handles user privacy preferences, data minimization, and consent
 */

import { auditLogger, AuditEventType } from '@/services/security/auditLogger';
import { cryptoService } from '@/services/security/cryptoService';

// Privacy levels available to users
export enum PrivacyLevel {
  MINIMAL = 'minimal',     // Collect only essential data
  STANDARD = 'standard',   // Default privacy protection
  ENHANCED = 'enhanced',   // Maximum privacy protection
  ANONYMOUS = 'anonymous'  // No personal data collection
}

// Data categories with privacy controls
export enum DataCategory {
  PROFILE = 'profile',
  BEHAVIORAL = 'behavioral',
  LOCATION = 'location',
  USAGE = 'usage',
  THERAPEUTIC = 'therapeutic',
  MEDICAL = 'medical',
  SOCIAL = 'social',
  TECHNICAL = 'technical',
  FINANCIAL = 'financial',
  COMMUNICATION = 'communication'
}

// Privacy controls for each data category
export interface PrivacyControl {
  category: DataCategory;
  collect: boolean;
  store: boolean;
  share: boolean;
  analyze: boolean;
  retain: number; // days, 0 = indefinite, -1 = do not retain
  encryption: 'none' | 'standard' | 'enhanced';
  anonymize: boolean;
}

// User privacy preferences
export interface PrivacyPreferences {
  userId: string;
  level: PrivacyLevel;
  controls: PrivacyControl[];
  consentGiven: Date;
  lastUpdated: Date;
  ipAddress?: string;
  userAgent?: string;
}

// Privacy audit log entry
export interface PrivacyAuditEntry {
  id: string;
  userId: string;
  action: 'data_collected' | 'data_accessed' | 'data_shared' | 'data_deleted' | 'consent_updated';
  dataCategory: DataCategory;
  purpose: string;
  legalBasis: 'consent' | 'legitimate_interest' | 'vital_interest' | 'legal_obligation';
  timestamp: Date;
  details: Record<string, any>;
}

// Default privacy controls for each level
const DEFAULT_PRIVACY_CONTROLS: Record<PrivacyLevel, PrivacyControl[]> = {
  [PrivacyLevel.MINIMAL]: [
    {
      category: DataCategory.PROFILE,
      collect: true,
      store: true,
      share: false,
      analyze: false,
      retain: 365,
      encryption: 'enhanced',
      anonymize: true
    },
    {
      category: DataCategory.THERAPEUTIC,
      collect: true,
      store: true,
      share: false,
      analyze: true,
      retain: 2555, // 7 years for medical records
      encryption: 'enhanced',
      anonymize: false
    },
    {
      category: DataCategory.USAGE,
      collect: false,
      store: false,
      share: false,
      analyze: false,
      retain: 0,
      encryption: 'none',
      anonymize: true
    },
    {
      category: DataCategory.BEHAVIORAL,
      collect: false,
      store: false,
      share: false,
      analyze: false,
      retain: 0,
      encryption: 'none',
      anonymize: true
    },
    {
      category: DataCategory.LOCATION,
      collect: false,
      store: false,
      share: false,
      analyze: false,
      retain: 0,
      encryption: 'none',
      anonymize: true
    }
  ],
  
  [PrivacyLevel.STANDARD]: [
    {
      category: DataCategory.PROFILE,
      collect: true,
      store: true,
      share: false,
      analyze: true,
      retain: 730, // 2 years
      encryption: 'enhanced',
      anonymize: false
    },
    {
      category: DataCategory.THERAPEUTIC,
      collect: true,
      store: true,
      share: false,
      analyze: true,
      retain: 2555, // 7 years
      encryption: 'enhanced',
      anonymize: false
    },
    {
      category: DataCategory.USAGE,
      collect: true,
      store: true,
      share: false,
      analyze: true,
      retain: 90,
      encryption: 'standard',
      anonymize: true
    },
    {
      category: DataCategory.BEHAVIORAL,
      collect: true,
      store: true,
      share: false,
      analyze: true,
      retain: 30,
      encryption: 'standard',
      anonymize: true
    },
    {
      category: DataCategory.LOCATION,
      collect: false,
      store: false,
      share: false,
      analyze: false,
      retain: 0,
      encryption: 'enhanced',
      anonymize: true
    }
  ],
  
  [PrivacyLevel.ENHANCED]: [
    {
      category: DataCategory.PROFILE,
      collect: true,
      store: true,
      share: false,
      analyze: true,
      retain: 1095, // 3 years
      encryption: 'enhanced',
      anonymize: false
    },
    {
      category: DataCategory.THERAPEUTIC,
      collect: true,
      store: true,
      share: false,
      analyze: true,
      retain: 2555, // 7 years
      encryption: 'enhanced',
      anonymize: false
    },
    {
      category: DataCategory.USAGE,
      collect: true,
      store: true,
      share: false,
      analyze: true,
      retain: 180,
      encryption: 'enhanced',
      anonymize: true
    },
    {
      category: DataCategory.BEHAVIORAL,
      collect: true,
      store: true,
      share: false,
      analyze: true,
      retain: 90,
      encryption: 'enhanced',
      anonymize: true
    },
    {
      category: DataCategory.LOCATION,
      collect: true,
      store: false,
      share: false,
      analyze: false,
      retain: 1,
      encryption: 'enhanced',
      anonymize: true
    }
  ],
  
  [PrivacyLevel.ANONYMOUS]: [
    {
      category: DataCategory.PROFILE,
      collect: false,
      store: false,
      share: false,
      analyze: false,
      retain: 0,
      encryption: 'none',
      anonymize: true
    },
    {
      category: DataCategory.THERAPEUTIC,
      collect: true,
      store: false,
      share: false,
      analyze: false,
      retain: 0,
      encryption: 'enhanced',
      anonymize: true
    },
    {
      category: DataCategory.USAGE,
      collect: true,
      store: false,
      share: false,
      analyze: true,
      retain: 0,
      encryption: 'enhanced',
      anonymize: true
    }
  ]
};

class PrivacyService {
  private static instance: PrivacyService;
  private userPreferences: Map<string, PrivacyPreferences> = new Map();
  private auditLog: PrivacyAuditEntry[] = [];

  private constructor() {}

  static getInstance(): PrivacyService {
    if (!PrivacyService.instance) {
      PrivacyService.instance = new PrivacyService();
    }
    return PrivacyService.instance;
  }

  /**
   * Initialize user privacy preferences
   */
  async initializeUserPrivacy(
    userId: string,
    level: PrivacyLevel = PrivacyLevel.STANDARD,
    customControls?: Partial<PrivacyControl>[]
  ): Promise<PrivacyPreferences> {
    try {
      const controls = [...DEFAULT_PRIVACY_CONTROLS[level]];

      // Apply custom controls if provided
      if (customControls) {
        customControls.forEach(customControl => {
          const index = controls.findIndex(c => c.category === customControl.category);
          if (index !== -1) {
            const { category, ...customControlWithoutCategory } = customControl;
            controls[index] = {
              ...controls[index],
              ...customControlWithoutCategory
            } as PrivacyControl;
          } else if (customControl.category) {
            // Add new control for category not in defaults
            const fullControl: PrivacyControl = {
              category: customControl.category,
              collect: false,
              store: false,
              share: false,
              analyze: false,
              retain: 0,
              encryption: 'enhanced',
              anonymize: true,
              ...customControl
            };
            controls.push(fullControl);
          }
        });
      }

      const preferences: PrivacyPreferences = {
        userId,
        level,
        controls,
        consentGiven: new Date(),
        lastUpdated: new Date()
      };

      this.userPreferences.set(userId, preferences);

      await this.auditPrivacyAction({
        userId,
        action: 'consent_updated',
        dataCategory: DataCategory.PROFILE,
        purpose: 'Initialize user privacy preferences',
        legalBasis: 'consent',
        details: {
          level,
          controlsCount: controls.length,
          customControls: !!customControls
        }
      });

      return preferences;

    } catch (error) {
      await auditLogger.logEvent(
        AuditEventType.CONFIGURATION_CHANGE,
        'privacy_init_failed',
        {
          userId,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          outcome: 'failure'
        }
      );
      throw error;
    }
  }

  /**
   * Get user privacy preferences
   */
  async getUserPrivacyPreferences(userId: string): Promise<PrivacyPreferences | null> {
    return this.userPreferences.get(userId) || null;
  }

  /**
   * Update user privacy preferences
   */
  async updatePrivacyPreferences(
    userId: string,
    updates: Partial<PrivacyPreferences>
  ): Promise<PrivacyPreferences> {
    const current = this.userPreferences.get(userId);
    if (!current) {
      throw new Error('User privacy preferences not found');
    }

    const updated: PrivacyPreferences = {
      ...current,
      ...updates,
      lastUpdated: new Date()
    };

    this.userPreferences.set(userId, updated);

    await this.auditPrivacyAction({
      userId,
      action: 'consent_updated',
      dataCategory: DataCategory.PROFILE,
      purpose: 'Update privacy preferences',
      legalBasis: 'consent',
      details: {
        previousLevel: current.level,
        newLevel: updated.level,
        changes: updates
      }
    });

    return updated;
  }

  /**
   * Check if data collection is allowed for user and category
   */
  async canCollectData(userId: string, category: DataCategory): Promise<boolean> {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) return false;

    const control = preferences.controls.find(c => c.category === category);
    return control?.collect ?? false;
  }

  /**
   * Check if data storage is allowed
   */
  async canStoreData(userId: string, category: DataCategory): Promise<boolean> {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) return false;

    const control = preferences.controls.find(c => c.category === category);
    return control?.store ?? false;
  }

  /**
   * Check if data sharing is allowed
   */
  async canShareData(userId: string, category: DataCategory): Promise<boolean> {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) return false;

    const control = preferences.controls.find(c => c.category === category);
    return control?.share ?? false;
  }

  /**
   * Get data retention period for category
   */
  async getRetentionPeriod(userId: string, category: DataCategory): Promise<number> {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) return 0;

    const control = preferences.controls.find(c => c.category === category);
    return control?.retain ?? 0;
  }

  /**
   * Process data collection with privacy controls
   */
  async processDataCollection(
    userId: string,
    category: DataCategory,
    data: any,
    purpose: string
  ): Promise<{ allowed: boolean; processedData?: any; error?: string }> {
    try {
      // Check if collection is allowed
      const canCollect = await this.canCollectData(userId, category);
      if (!canCollect) {
        return { allowed: false, error: 'Data collection not permitted for this category' };
      }

      const preferences = this.userPreferences.get(userId);
      if (!preferences) {
        return { allowed: false, error: 'User privacy preferences not found' };
      }

      const control = preferences.controls.find(c => c.category === category);
      if (!control) {
        return { allowed: false, error: 'No privacy control found for category' };
      }

      let processedData = data;

      // Apply data minimization
      processedData = await this.applyDataMinimization(processedData, category, control);

      // Apply anonymization if required
      if (control.anonymize) {
        processedData = await this.anonymizeData(processedData, category);
      }

      // Apply encryption if required
      if (control.encryption !== 'none') {
        processedData = await this.encryptData(processedData, control.encryption);
      }

      // Audit the collection
      await this.auditPrivacyAction({
        userId,
        action: 'data_collected',
        dataCategory: category,
        purpose,
        legalBasis: 'consent',
        details: {
          dataSize: JSON.stringify(data).length,
          anonymized: control.anonymize,
          encrypted: control.encryption !== 'none'
        }
      });

      return { allowed: true, processedData };

    } catch (error) {
      await auditLogger.logEvent(
        AuditEventType.ENCRYPTION_FAILURE,
        'data_processing_error',
        {
          userId,
          category,
          purpose,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          outcome: 'failure'
        }
      );

      return { allowed: false, error: 'Data processing failed' };
    }
  }

  /**
   * Generate privacy transparency report
   */
  async generateTransparencyReport(userId: string): Promise<{
    preferences: PrivacyPreferences;
    dataCollected: { category: DataCategory; count: number; lastCollection: Date }[];
    auditEntries: PrivacyAuditEntry[];
    recommendations: string[];
  }> {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) {
      throw new Error('User privacy preferences not found');
    }

    const userAuditEntries = this.auditLog.filter(entry => entry.userId === userId);
    
    const dataCollected = Object.values(DataCategory).map(category => {
      const entries = userAuditEntries.filter(
        entry => entry.dataCategory === category && entry.action === 'data_collected'
      );
      
      return {
        category,
        count: entries.length,
        lastCollection: entries.length > 0 
          ? new Date(Math.max(...entries.map(e => e.timestamp.getTime())))
          : new Date(0)
      };
    }).filter(item => item.count > 0);

    const recommendations = await this.generatePrivacyRecommendations(preferences, userAuditEntries);

    return {
      preferences,
      dataCollected,
      auditEntries: userAuditEntries,
      recommendations
    };
  }

  /**
   * Delete user data (Right to Erasure / Right to be Forgotten)
   */
  async deleteUserData(
    userId: string,
    categories?: DataCategory[],
    reason: string = 'User request'
  ): Promise<{ success: boolean; deletedCategories: DataCategory[]; errors: string[] }> {
    const preferences = this.userPreferences.get(userId);
    if (!preferences) {
      return { success: false, deletedCategories: [], errors: ['User not found'] };
    }

    const categoriesToDelete = categories || Object.values(DataCategory);
    const deletedCategories: DataCategory[] = [];
    const errors: string[] = [];

    for (const category of categoriesToDelete) {
      try {
        // Check if deletion is allowed (some medical data might need to be retained)
        const canDelete = await this.canDeleteData(userId, category);
        if (!canDelete) {
          errors.push(`Cannot delete ${category} data due to legal retention requirements`);
          continue;
        }

        // In production, this would delete actual data from databases
        await this.performDataDeletion(userId, category);
        
        deletedCategories.push(category);

        await this.auditPrivacyAction({
          userId,
          action: 'data_deleted',
          dataCategory: category,
          purpose: reason,
          legalBasis: 'legal_obligation',
          details: { deletionReason: reason }
        });

      } catch (error) {
        errors.push(`Failed to delete ${category}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const success = errors.length === 0;
    
    await auditLogger.logEvent(
      AuditEventType.PHI_DELETE,
      'user_data_deletion',
      {
        userId,
        outcome: success ? 'success' : 'partial',
        details: {
          requestedCategories: categoriesToDelete,
          deletedCategories,
          errors,
          reason
        }
      }
    );

    return { success, deletedCategories, errors };
  }

  /**
   * Export user data (Data Portability)
   */
  async exportUserData(userId: string, format: 'json' | 'csv' | 'xml' = 'json'): Promise<{
    success: boolean;
    data?: string;
    error?: string;
  }> {
    try {
      const preferences = this.userPreferences.get(userId);
      if (!preferences) {
        return { success: false, error: 'User not found' };
      }

      // In production, this would collect all user data from various sources
      const userData = {
        preferences,
        auditLog: this.auditLog.filter(entry => entry.userId === userId),
        exportDate: new Date().toISOString(),
        format
      };

      let exportData: string;
      switch (format) {
        case 'json':
          exportData = JSON.stringify(userData, null, 2);
          break;
        case 'csv':
          exportData = await this.convertToCSV(userData);
          break;
        case 'xml':
          exportData = await this.convertToXML(userData);
          break;
        default:
          throw new Error('Unsupported format');
      }

      await this.auditPrivacyAction({
        userId,
        action: 'data_accessed',
        dataCategory: DataCategory.PROFILE,
        purpose: 'Data export request',
        legalBasis: 'consent',
        details: { format, dataSize: exportData.length }
      });

      return { success: true, data: exportData };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Export failed' 
      };
    }
  }

  // Private helper methods

  private async applyDataMinimization(data: any, category: DataCategory, control: PrivacyControl): Promise<any> {
    // Implement data minimization rules based on category
    const minimized = { ...data };

    switch (category) {
      case DataCategory.PROFILE:
        // Only collect essential profile fields
        const allowedFields = ['firstName', 'lastName', 'dateOfBirth', 'email'];
        Object.keys(minimized).forEach(key => {
          if (!allowedFields.includes(key)) {
            delete minimized[key];
          }
        });
        break;
        
      case DataCategory.LOCATION:
        // Reduce location precision
        if (minimized.latitude && minimized.longitude) {
          minimized.latitude = Math.round(minimized.latitude * 100) / 100; // 2 decimal places
          minimized.longitude = Math.round(minimized.longitude * 100) / 100;
        }
        break;
        
      default:
        // Default minimization - remove null/undefined values
        Object.keys(minimized).forEach(key => {
          if (minimized[key] == null) {
            delete minimized[key];
          }
        });
    }

    return minimized;
  }

  private async anonymizeData(data: any, category: DataCategory): Promise<any> {
    const anonymized = { ...data };

    // Apply anonymization techniques based on category
    if (anonymized.email) {
      anonymized.email = await cryptoService.hash(anonymized.email);
    }
    
    if (anonymized.firstName) {
      anonymized.firstName = `User_${(await cryptoService.hash(anonymized.firstName)).slice(0, 8)}`;
    }
    
    if (anonymized.lastName) {
      anonymized.lastName = '[ANONYMIZED]';
    }

    return anonymized;
  }

  private async encryptData(data: any, level: 'standard' | 'enhanced'): Promise<any> {
    if (level === 'enhanced') {
      return await cryptoService.encryptObject(data, 'privacy_enhanced');
    } else {
      return await cryptoService.encryptObject(data, 'privacy_standard');
    }
  }

  private async canDeleteData(userId: string, category: DataCategory): Promise<boolean> {
    // Check legal retention requirements
    const legalRetentionCategories = [
      DataCategory.MEDICAL,
      DataCategory.THERAPEUTIC,
      DataCategory.FINANCIAL
    ];

    // Medical/therapeutic data might need to be retained for legal reasons
    if (legalRetentionCategories.includes(category)) {
      // In production, check against retention policies and legal requirements
      return false;
    }

    return true;
  }

  private async performDataDeletion(userId: string, category: DataCategory): Promise<void> {
    // In production, this would delete data from actual storage systems
    console.log(`Deleting ${category} data for user ${userId}`);
  }

  private async generatePrivacyRecommendations(
    preferences: PrivacyPreferences,
    auditEntries: PrivacyAuditEntry[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Check if user has been active recently
    const recentActivity = auditEntries.filter(
      entry => entry.timestamp > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    if (recentActivity.length === 0) {
      recommendations.push('Consider reviewing your privacy settings as you have not been active recently');
    }

    // Check for data collection patterns
    const collectionEntries = auditEntries.filter(entry => entry.action === 'data_collected');
    if (collectionEntries.length > 100) {
      recommendations.push('High data collection detected - consider switching to a more restrictive privacy level');
    }

    // Check privacy level appropriateness
    if (preferences.level === PrivacyLevel.STANDARD) {
      recommendations.push('Consider Enhanced privacy level for better protection of your mental health data');
    }

    return recommendations;
  }

  private async auditPrivacyAction(entry: Omit<PrivacyAuditEntry, 'id' | 'timestamp'>): Promise<void> {
    const auditEntry: PrivacyAuditEntry = {
      id: `privacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...entry
    };

    this.auditLog.push(auditEntry);

    // Also log to main audit system
    await auditLogger.logEvent(
      AuditEventType.PHI_ACCESS,
      entry.action,
      {
        userId: entry.userId,
        details: {
          dataCategory: entry.dataCategory,
          purpose: entry.purpose,
          legalBasis: entry.legalBasis,
          ...entry.details
        }
      }
    );
  }

  private async convertToCSV(data: any): Promise<string> {
    // Simple CSV conversion - in production use a proper CSV library
    return 'CSV export not implemented in demo';
  }

  private async convertToXML(data: any): Promise<string> {
    // Simple XML conversion - in production use a proper XML library
    return '<export>XML export not implemented in demo</export>';
  }
}

// Export singleton instance
export const privacyService = PrivacyService.getInstance();
