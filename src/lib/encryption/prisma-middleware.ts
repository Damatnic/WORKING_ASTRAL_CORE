import { Prisma } from '@prisma/client';
import { FieldEncryption, PHI_FIELD_TYPES, type PHIFieldType, type EncryptedField } from './field-encryption';

/**
 * Prisma middleware for automatic field-level encryption/decryption
 * This middleware intercepts database operations and handles PHI data encryption
 */

// Define which fields in each model require encryption
export const ENCRYPTION_FIELD_MAPPINGS = {
  User: {
    email: PHI_FIELD_TYPES.EMAIL,
    fullName: PHI_FIELD_TYPES.FULL_NAME,
    phoneNumber: PHI_FIELD_TYPES.PHONE,
    address: PHI_FIELD_TYPES.ADDRESS,
    dateOfBirth: PHI_FIELD_TYPES.DATE_OF_BIRTH,
    emergencyContactInfo: PHI_FIELD_TYPES.EMERGENCY_CONTACT,
  },
  TherapySession: {
    sessionNotes: PHI_FIELD_TYPES.THERAPY_NOTES,
    progressNotes: PHI_FIELD_TYPES.TREATMENT_NOTES,
    transcript: PHI_FIELD_TYPES.SESSION_TRANSCRIPT,
  },
  MoodEntry: {
    notes: PHI_FIELD_TYPES.MOOD_DATA,
    triggers: PHI_FIELD_TYPES.MOOD_DATA,
  },
  JournalEntry: {
    content: PHI_FIELD_TYPES.JOURNAL_ENTRY,
    title: PHI_FIELD_TYPES.JOURNAL_ENTRY,
  },
  CrisisAssessment: {
    riskFactors: PHI_FIELD_TYPES.CRISIS_NOTES,
    safetyPlan: PHI_FIELD_TYPES.SAFETY_PLAN,
    interventionNotes: PHI_FIELD_TYPES.CRISIS_NOTES,
  },
  PrivateMessage: {
    content: PHI_FIELD_TYPES.PRIVATE_MESSAGE,
    subject: PHI_FIELD_TYPES.PRIVATE_MESSAGE,
  },
  UserProfile: {
    medicalHistory: PHI_FIELD_TYPES.TREATMENT_NOTES,
    medications: PHI_FIELD_TYPES.MEDICATION,
    allergies: PHI_FIELD_TYPES.TREATMENT_NOTES,
    insuranceInfo: PHI_FIELD_TYPES.INSURANCE_ID,
  },
  Assessment: {
    results: PHI_FIELD_TYPES.ASSESSMENT_RESULTS,
    notes: PHI_FIELD_TYPES.ASSESSMENT_RESULTS,
  },
} as const;

type ModelName = keyof typeof ENCRYPTION_FIELD_MAPPINGS;

/**
 * Get user ID from the operation context
 */
function getUserIdFromContext(params: any): string | undefined {
  // Try to get user ID from where clause or data
  if (params.args?.where?.userId) {
    return params.args.where.userId;
  }
  if (params.args?.where?.user?.id) {
    return params.args.where.user.id;
  }
  if (params.args?.data?.userId) {
    return params.args.data.userId;
  }
  if (params.args?.data?.user?.connect?.id) {
    return params.args.data.user.connect.id;
  }
  
  // For update operations, try to extract from existing data
  if (params.args?.where?.id && params.model) {
    // This would require a separate query to get the user ID
    // For now, we'll handle this case separately
    return undefined;
  }
  
  return undefined;
}

/**
 * Encrypt data before database operations
 */
function encryptData(data: any, modelName: ModelName, userId?: string): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const fieldMappings = ENCRYPTION_FIELD_MAPPINGS[modelName];
  if (!fieldMappings) {
    return data;
  }

  const fieldEncryption = new FieldEncryption(userId);
  const encrypted = { ...data };

  // Handle nested objects and arrays
  if (Array.isArray(data)) {
    return data.map(item => encryptData(item, modelName, userId));
  }

  // Encrypt fields that are mapped
  for (const [fieldName, fieldType] of Object.entries(fieldMappings)) {
    if (data[fieldName] !== undefined && data[fieldName] !== null) {
      // Skip if already encrypted
      if (typeof data[fieldName] === 'object' && data[fieldName].data && data[fieldName].fieldType) {
        continue;
      }
      
      encrypted[fieldName] = fieldEncryption.encrypt(data[fieldName], fieldType as PHIFieldType);
    }
  }

  // Handle nested create/update operations
  for (const [key, value] of Object.entries(data)) {
    if (key === 'create' || key === 'update' || key === 'upsert') {
      if (Array.isArray(value)) {
        encrypted[key] = value.map(item => encryptData(item, modelName, userId));
      } else if (value && typeof value === 'object') {
        encrypted[key] = encryptData(value, modelName, userId);
      }
    }
  }

  return encrypted;
}

/**
 * Decrypt data after database operations
 */
function decryptData(data: any, modelName: ModelName, userId?: string): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const fieldMappings = ENCRYPTION_FIELD_MAPPINGS[modelName];
  if (!fieldMappings) {
    return data;
  }

  const fieldEncryption = new FieldEncryption(userId);

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => decryptData(item, modelName, userId));
  }

  const decrypted = { ...data };

  // Decrypt fields that are mapped
  for (const fieldName of Object.keys(fieldMappings)) {
    if (data[fieldName] && typeof data[fieldName] === 'object') {
      // Check if it's an encrypted field
      if (data[fieldName].data && data[fieldName].fieldType) {
        try {
          decrypted[fieldName] = fieldEncryption.decrypt(data[fieldName] as EncryptedField);
        } catch (error) {
          console.error(`Failed to decrypt field ${fieldName} for model ${modelName}:`, error);
          // Keep encrypted data if decryption fails
          decrypted[fieldName] = data[fieldName];
        }
      }
    }
  }

  // Handle nested relations
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && !(value as any).data) {
      if (Array.isArray(value)) {
        decrypted[key] = value.map(item => {
          // Try to determine the model name from the relation
          const relatedModel = getRelatedModelName(key);
          return relatedModel ? decryptData(item, relatedModel, userId) : item;
        });
      } else {
        const relatedModel = getRelatedModelName(key);
        if (relatedModel) {
          decrypted[key] = decryptData(value, relatedModel, userId);
        }
      }
    }
  }

  return decrypted;
}

/**
 * Get related model name from relation field name
 */
function getRelatedModelName(relationName: string): ModelName | undefined {
  const relationMappings: Record<string, ModelName> = {
    user: 'User',
    users: 'User',
    therapySessions: 'TherapySession',
    moodEntries: 'MoodEntry',
    journalEntries: 'JournalEntry',
    crisisAssessments: 'CrisisAssessment',
    messages: 'PrivateMessage',
    profile: 'UserProfile',
    assessments: 'Assessment',
  };

  return relationMappings[relationName];
}

/**
 * Create the encryption middleware
 */
export function createEncryptionMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const { model, action } = params;

    // Skip if no model or not a relevant model
    if (!model || !(model in ENCRYPTION_FIELD_MAPPINGS)) {
      return next(params);
    }

    const modelName = model as ModelName;
    const userId = getUserIdFromContext(params);

    try {
      // Encrypt data for write operations
      if (['create', 'update', 'upsert'].includes(action)) {
        if (params.args.data) {
          params.args.data = encryptData(params.args.data, modelName, userId);
        }
        
        // Handle upsert operations
        if (action === 'upsert') {
          if (params.args.create) {
            params.args.create = encryptData(params.args.create, modelName, userId);
          }
          if (params.args.update) {
            params.args.update = encryptData(params.args.update, modelName, userId);
          }
        }

        // Handle createMany
        if (action === 'createMany' && params.args.data) {
          params.args.data = Array.isArray(params.args.data) 
            ? params.args.data.map((item: any) => encryptData(item, modelName, userId))
            : encryptData(params.args.data, modelName, userId);
        }
      }

      // Execute the query
      const result = await next(params);

      // Decrypt data for read operations
      if (['findFirst', 'findUnique', 'findMany'].includes(action)) {
        return decryptData(result, modelName, userId);
      }

      // For write operations, decrypt the returned data if needed
      if (['create', 'update', 'upsert'].includes(action) && result) {
        return decryptData(result, modelName, userId);
      }

      return result;
    } catch (error) {
      console.error(`Encryption middleware error for ${model}.${action}:`, error);
      
      // Log audit trail for failed operations
      console.error('Encryption operation failed', {
        model,
        action,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      
      // Re-throw the error to maintain normal error handling
      throw error;
    }
  };
}

/**
 * Utility to handle manual encryption/decryption for complex queries
 */
export class ManualEncryption {
  private fieldEncryption: FieldEncryption;
  private modelName: ModelName;

  constructor(modelName: ModelName, userId?: string) {
    this.fieldEncryption = new FieldEncryption(userId);
    this.modelName = modelName;
  }

  /**
   * Encrypt search parameters for where clauses
   */
  encryptSearchParams(where: any): any {
    const fieldMappings = ENCRYPTION_FIELD_MAPPINGS[this.modelName];
    const encrypted = { ...where };

    for (const [fieldName, fieldType] of Object.entries(fieldMappings)) {
      if (where[fieldName]) {
        // For exact matches, create searchable hash
        if (typeof where[fieldName] === 'string') {
          encrypted[`${fieldName}_hash`] = this.fieldEncryption.hash(where[fieldName], fieldType as PHIFieldType);
          delete encrypted[fieldName]; // Remove plaintext search
        }
        
        // For contains/startsWith, we'd need to implement tokenization
        // This is complex and may require separate search infrastructure
      }
    }

    return encrypted;
  }

  /**
   * Create searchable hashes for a record
   */
  createSearchableHashes(data: any): any {
    const fieldMappings = ENCRYPTION_FIELD_MAPPINGS[this.modelName];
    const hashes: any = {};

    for (const [fieldName, fieldType] of Object.entries(fieldMappings)) {
      if (data[fieldName] && typeof data[fieldName] === 'string') {
        hashes[`${fieldName}_hash`] = this.fieldEncryption.hash(data[fieldName], fieldType as PHIFieldType);
      }
    }

    return hashes;
  }
}

export type { ModelName };