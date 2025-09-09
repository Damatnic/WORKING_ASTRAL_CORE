import { NextRequest } from 'next/server';
import { FieldEncryption, PHI_FIELD_TYPES, type PHIFieldType } from './field-encryption';
import { ManualEncryption, ENCRYPTION_FIELD_MAPPINGS, type ModelName } from './prisma-middleware';
import { getUserFromRequest } from '@/lib/auth-middleware';

/**
 * API utilities for handling encrypted data in routes
 */

/**
 * Extract user ID from authenticated request
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string | undefined> {
  try {
    const user = await getUserFromRequest(request);
    return user?.id;
  } catch (error) {
    console.error('Failed to get user from request:', error);
    return undefined;
  }
}

/**
 * Encrypt request body data before database operations
 */
export async function encryptRequestData<T extends Record<string, any>>(
  request: NextRequest,
  data: T,
  modelName: ModelName
): Promise<T> {
  const userId = await getUserIdFromRequest(request);
  const fieldMappings = ENCRYPTION_FIELD_MAPPINGS[modelName];
  
  if (!fieldMappings) {
    return data;
  }

  const fieldEncryption = new FieldEncryption(userId);
  const encrypted = { ...data };

  for (const [fieldName, fieldType] of Object.entries(fieldMappings)) {
    if (data[fieldName] !== undefined && data[fieldName] !== null) {
      encrypted[fieldName] = fieldEncryption.encrypt(
        data[fieldName],
        fieldType as PHIFieldType
      );
      
      // Create searchable hash for database queries
      if (typeof data[fieldName] === 'string' && data[fieldName].trim()) {
        encrypted[`${fieldName}_hash`] = fieldEncryption.hash(
          data[fieldName],
          fieldType as PHIFieldType
        );
      }
    }
  }

  return encrypted;
}

/**
 * Decrypt response data after database operations
 */
export async function decryptResponseData<T extends Record<string, any> | Array<Record<string, any>>>(
  request: NextRequest,
  data: T,
  modelName: ModelName
): Promise<T> {
  const userId = await getUserIdFromRequest(request);
  const fieldMappings = ENCRYPTION_FIELD_MAPPINGS[modelName];
  
  if (!fieldMappings) {
    return data;
  }

  const fieldEncryption = new FieldEncryption(userId);

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => {
      const decrypted = { ...item };
      
      for (const fieldName of Object.keys(fieldMappings)) {
        if (item[fieldName] && typeof item[fieldName] === 'object' && item[fieldName].data) {
          try {
            decrypted[fieldName] = fieldEncryption.decrypt(item[fieldName]);
          } catch (error) {
            console.error(`Failed to decrypt field ${fieldName}:`, error);
            decrypted[fieldName] = null; // Don't expose encrypted data
          }
        }
      }
      
      // Remove hash fields from response
      for (const fieldName of Object.keys(fieldMappings)) {
        delete decrypted[`${fieldName}_hash`];
      }
      
      return decrypted;
    }) as T;
  }

  // Handle single object
  if (data && typeof data === 'object') {
    const decrypted = { ...data };
    
    for (const fieldName of Object.keys(fieldMappings)) {
      if (data[fieldName] && typeof data[fieldName] === 'object' && data[fieldName].data) {
        try {
          decrypted[fieldName] = fieldEncryption.decrypt(data[fieldName]);
        } catch (error) {
          console.error(`Failed to decrypt field ${fieldName}:`, error);
          decrypted[fieldName] = null; // Don't expose encrypted data
        }
      }
    }
    
    // Remove hash fields from response
    for (const fieldName of Object.keys(fieldMappings)) {
      delete decrypted[`${fieldName}_hash`];
    }
    
    return decrypted as T;
  }

  return data;
}

/**
 * Create search parameters for encrypted fields
 */
export async function createEncryptedSearch(
  request: NextRequest,
  searchParams: Record<string, any>,
  modelName: ModelName
): Promise<Record<string, any>> {
  const userId = await getUserIdFromRequest(request);
  const manualEncryption = new ManualEncryption(modelName, userId);
  
  return manualEncryption.encryptSearchParams(searchParams);
}

/**
 * Middleware for automatic encryption/decryption in API routes
 */
export function withEncryption<T extends ModelName>(modelName: T) {
  return function (handler: (req: NextRequest, context: any) => Promise<Response>) {
    return async function (request: NextRequest, context: any) {
      try {
        // Parse request body if present
        let body: any = null;
        if (request.headers.get('content-type')?.includes('application/json')) {
          try {
            body = await request.json();
          } catch (error) {
            // Request might not have JSON body
          }
        }

        // Encrypt request data if body exists
        if (body) {
          body = await encryptRequestData(request, body, modelName);
          // Create new request with encrypted body
          const encryptedRequest = new NextRequest(request.url, {
            ...request,
            body: JSON.stringify(body),
            headers: {
              ...Object.fromEntries(request.headers.entries()),
              'content-type': 'application/json',
            },
          });
          request = encryptedRequest;
        }

        // Call original handler
        const response = await handler(request, context);

        // If response is JSON, decrypt the data
        if (response.headers.get('content-type')?.includes('application/json')) {
          const responseData = await response.json();
          
          if (responseData.success && responseData.data) {
            responseData.data = await decryptResponseData(request, responseData.data, modelName);
          }
          
          return new Response(JSON.stringify(responseData), {
            status: response.status,
            headers: response.headers,
          });
        }

        return response;
      } catch (error) {
        console.error('Encryption middleware error:', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Internal server error',
            timestamp: new Date().toISOString()
          }),
          { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
    };
  };
}

/**
 * Validate encrypted field integrity
 */
export function validateEncryptedField(field: any): boolean {
  if (!field || typeof field !== 'object') {
    return false;
  }
  
  return (
    typeof field.data === 'string' &&
    typeof field.version === 'number' &&
    typeof field.fieldType === 'string' &&
    typeof field.timestamp === 'string' &&
    field.version > 0 &&
    Object.values(PHI_FIELD_TYPES).includes(field.fieldType)
  );
}

/**
 * Sanitize data for logs (remove PHI)
 */
export function sanitizeForLogs(data: any, modelName: ModelName): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const fieldMappings = ENCRYPTION_FIELD_MAPPINGS[modelName];
  if (!fieldMappings) {
    return data;
  }

  const sanitized = { ...data };

  // Remove or redact PHI fields
  for (const fieldName of Object.keys(fieldMappings)) {
    if (sanitized[fieldName] !== undefined) {
      sanitized[fieldName] = '[ENCRYPTED PHI]';
    }
    // Also remove hash fields
    delete sanitized[`${fieldName}_hash`];
  }

  return sanitized;
}

/**
 * Create audit log entry for encrypted data access
 */
export async function logEncryptedDataAccess(
  request: NextRequest,
  operation: 'read' | 'write' | 'delete',
  modelName: ModelName,
  recordId?: string,
  success: boolean = true,
  error?: string
): Promise<void> {
  const userId = await getUserIdFromRequest(request);
  const userAgent = request.headers.get('user-agent');
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') ||
                   'unknown';

  const auditEntry = {
    timestamp: new Date().toISOString(),
    userId: userId || 'anonymous',
    operation,
    modelName,
    recordId,
    success,
    error,
    userAgent,
    ipAddress,
    requestId: request.headers.get('x-request-id') || crypto.randomUUID(),
  };

  // In production, this would go to a secure audit system
  console.log('PHI Access Audit:', JSON.stringify(auditEntry));
  
  // TODO: Implement secure audit log storage
  // await auditLogService.logPHIAccess(auditEntry);
}

/**
 * Check if user has permission to access encrypted data
 */
export async function checkEncryptedDataPermission(
  request: NextRequest,
  operation: 'read' | 'write' | 'delete',
  modelName: ModelName,
  resourceOwnerId?: string
): Promise<boolean> {
  const userId = await getUserIdFromRequest(request);
  
  if (!userId) {
    return false;
  }

  // For now, users can only access their own data
  // In a full implementation, this would check role-based permissions
  if (resourceOwnerId && resourceOwnerId !== userId) {
    // Check if user has clinical role that allows access to other users' data
    // This would integrate with the role-based access control system
    return false;
  }

  return true;
}

export type { ModelName };