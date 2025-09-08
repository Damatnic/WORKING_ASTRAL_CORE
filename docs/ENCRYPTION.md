# Field-Level Encryption for PHI Data

This document describes the comprehensive field-level encryption system implemented in Astral Core for protecting Protected Health Information (PHI) data in compliance with HIPAA requirements.

## Overview

Astral Core implements **field-level encryption** using **AES-256-GCM** to protect all PHI data at the database level. This ensures that sensitive information is encrypted before storage and automatically decrypted when accessed by authorized users.

## Key Features

- **AES-256-GCM Encryption**: Industry-standard authenticated encryption
- **Field-Specific Keys**: Each field type has its own derived encryption key
- **Automatic Encryption/Decryption**: Transparent through Prisma middleware
- **Searchable Hashes**: HMAC-SHA256 hashes for encrypted field queries
- **Audit Logging**: Comprehensive audit trail for all PHI access
- **Key Rotation Support**: Built-in support for encryption key rotation
- **HIPAA Compliance**: Meets HIPAA security and privacy requirements

## Architecture

### Encryption Components

1. **Field Encryption Service** (`/src/lib/encryption/field-encryption.ts`)
   - Core encryption/decryption utilities
   - Key derivation using HKDF
   - Searchable hash generation
   - Audit logging

2. **Prisma Middleware** (`/src/lib/encryption/prisma-middleware.ts`)
   - Automatic encryption on database writes
   - Automatic decryption on database reads
   - Handles nested relations and bulk operations

3. **API Utilities** (`/src/lib/encryption/api-utils.ts`)
   - Request/response encryption handling
   - Permission checking
   - Audit logging for API access

### PHI Field Types

The system encrypts the following types of PHI data:

```typescript
// Personal Identifiers
FULL_NAME, EMAIL, PHONE, ADDRESS, DATE_OF_BIRTH, SSN

// Medical Information
MEDICAL_RECORD_NUMBER, INSURANCE_ID, DIAGNOSIS, MEDICATION
TREATMENT_NOTES, THERAPY_NOTES, ASSESSMENT_RESULTS

// Mental Health Specific
CRISIS_NOTES, SAFETY_PLAN, MOOD_DATA, JOURNAL_ENTRY
SESSION_TRANSCRIPT

// Communication
PRIVATE_MESSAGE, EMERGENCY_CONTACT

// Biometric/Device Data
BIOMETRIC_DATA, DEVICE_ID, IP_ADDRESS
```

## Implementation

### Environment Configuration

```bash
# Field-level encryption for PHI data (HIPAA Compliance)
FIELD_ENCRYPTION_KEY="64-character-hex-key-for-aes-256-encryption"
FIELD_ENCRYPTION_PEPPER="unique-pepper-for-key-derivation-32-chars"
```

**⚠️ CRITICAL**: These keys must be:
- Generated using cryptographically secure random sources
- Stored securely (HSM, secure key management service)
- Never committed to version control
- Backed up in multiple secure locations
- Rotated regularly (quarterly recommended)

### Database Schema

Encrypted fields are stored as JSON objects:

```typescript
interface EncryptedField {
  data: string;      // Base64: IV + encrypted_data + auth_tag
  version: number;   // Encryption version for key rotation
  fieldType: string; // Field type for key derivation
  timestamp: string; // ISO timestamp of encryption
}
```

Searchable hashes are stored in separate columns:
```sql
-- Example for User table
ALTER TABLE "User" ADD COLUMN "email_hash" TEXT;
ALTER TABLE "User" ADD COLUMN "fullName_hash" TEXT;
CREATE INDEX "User_email_hash_idx" ON "User"("email_hash");
```

### Usage Examples

#### Basic Encryption/Decryption

```typescript
import { FieldEncryption, PHI_FIELD_TYPES } from '@/lib/encryption/field-encryption';

const encryption = new FieldEncryption(userId);

// Encrypt sensitive data
const encrypted = encryption.encrypt(
  "John Doe", 
  PHI_FIELD_TYPES.FULL_NAME
);

// Decrypt data
const decrypted = encryption.decrypt(encrypted);
```

#### API Route with Automatic Encryption

```typescript
import { 
  encryptRequestData, 
  decryptResponseData,
  logEncryptedDataAccess 
} from '@/lib/encryption/api-utils';

export async function PUT(request: NextRequest) {
  const user = await getUserFromRequest(request);
  const body = await request.json();
  
  // Encrypt request data
  const encryptedData = await encryptRequestData(request, body, 'User');
  
  // Save to database (Prisma middleware handles encryption)
  const result = await prisma.user.update({
    where: { id: user.id },
    data: encryptedData
  });
  
  // Decrypt response data
  const decryptedResult = await decryptResponseData(request, result, 'User');
  
  // Log access for audit trail
  await logEncryptedDataAccess(request, 'write', 'User', user.id, true);
  
  return NextResponse.json(decryptedResult);
}
```

#### Searching Encrypted Data

```typescript
import { ManualEncryption } from '@/lib/encryption/prisma-middleware';

const manualEncryption = new ManualEncryption('User', userId);

// Create searchable hash for exact matching
const emailHash = manualEncryption.hash(
  'user@example.com', 
  PHI_FIELD_TYPES.EMAIL
);

// Find user by encrypted email
const user = await prisma.user.findFirst({
  where: { email_hash: emailHash }
});
```

## Security Considerations

### Key Management

1. **Master Key Security**
   - Store `FIELD_ENCRYPTION_KEY` in secure key management system
   - Use Hardware Security Module (HSM) in production
   - Implement proper key backup and recovery procedures

2. **Key Derivation**
   - Uses HKDF (HMAC-based Key Derivation Function)
   - Field-specific keys derived from master key
   - Incorporates user ID and field type for key isolation

3. **Key Rotation**
   - Supports versioned encryption for seamless key rotation
   - Plan quarterly key rotation schedule
   - Implement gradual migration process

### Encryption Details

1. **Algorithm**: AES-256-GCM (Authenticated Encryption)
   - 256-bit encryption key
   - 128-bit initialization vector (IV)
   - 128-bit authentication tag

2. **IV Generation**: Cryptographically secure random IV for each encryption

3. **Authentication**: GCM mode provides built-in authentication

### Access Control

1. **User Isolation**: Users can only decrypt their own data
2. **Role-Based Access**: Clinical roles have access to patient data
3. **Audit Logging**: All PHI access is logged with context
4. **Permission Checking**: API-level permission validation

## HIPAA Compliance

### Technical Safeguards

- ✅ **Access Control**: User-based data isolation
- ✅ **Audit Controls**: Comprehensive audit logging
- ✅ **Integrity**: Authentication tags prevent tampering
- ✅ **Person Authentication**: JWT-based authentication
- ✅ **Transmission Security**: HTTPS for all communications

### Administrative Safeguards

- ✅ **Assigned Security Responsibility**: Documented security procedures
- ✅ **Workforce Training**: Security awareness documentation
- ✅ **Information Access Management**: Role-based access control
- ✅ **Incident Response**: Audit logs for security incidents

### Physical Safeguards

- ✅ **Workstation Use**: Secure development practices
- ✅ **Device Controls**: Encrypted data at rest
- ✅ **Media Disposal**: Secure key destruction procedures

## Monitoring and Auditing

### Audit Logs

All PHI operations are logged:

```typescript
{
  timestamp: "2024-12-06T10:30:00Z",
  userId: "user-uuid",
  operation: "read" | "write" | "delete",
  modelName: "User",
  recordId: "record-uuid",
  success: true,
  error: null,
  userAgent: "browser-info",
  ipAddress: "client-ip"
}
```

### Monitoring Alerts

- Failed decryption attempts
- Bulk data access patterns
- Key rotation requirements
- Authentication failures
- Permission violations

## Backup and Recovery

### Encrypted Backups

1. **Database Backups**: Include encrypted fields as-is
2. **Key Backups**: Separate, secure backup of encryption keys
3. **Point-in-Time Recovery**: Maintain key version history

### Disaster Recovery

1. **Key Recovery**: Multi-location key storage
2. **Data Recovery**: Encrypted backups with proper key management
3. **Testing**: Regular recovery procedure testing

## Performance Considerations

### Optimization Strategies

1. **Batch Operations**: Encrypt/decrypt multiple fields together
2. **Caching**: Cache decrypted data appropriately (with TTL)
3. **Indexing**: Use searchable hashes for database queries
4. **Connection Pooling**: Optimize database connections

### Performance Metrics

- Encryption/decryption latency: ~1-5ms per field
- Database query impact: Minimal with proper indexing
- Memory usage: Temporary encryption buffers
- CPU usage: AES hardware acceleration when available

## Testing

### Unit Tests

```bash
npm test -- --testNamePattern="encryption"
```

### Integration Tests

```bash
npm run test:integration -- --testNamePattern="encrypted-api"
```

### Security Tests

```bash
npm run test:security -- --testNamePattern="phi-encryption"
```

## Compliance Verification

### Regular Audits

1. **Quarterly**: Review encryption implementation
2. **Semi-annually**: Key rotation procedures
3. **Annually**: Full HIPAA compliance audit

### Penetration Testing

1. **External**: Third-party security assessment
2. **Internal**: Regular vulnerability scanning
3. **Social Engineering**: Test human factors

## Troubleshooting

### Common Issues

1. **Decryption Failures**
   - Check key configuration
   - Verify user permissions
   - Review audit logs

2. **Performance Issues**
   - Monitor encryption metrics
   - Check database indexing
   - Review query patterns

3. **Key Rotation Problems**
   - Verify version compatibility
   - Check migration status
   - Review backup procedures

### Error Codes

- `ENCRYPTION_KEY_MISSING`: Configuration error
- `DECRYPTION_FAILED`: Invalid encrypted data or key
- `PERMISSION_DENIED`: Access control violation
- `KEY_ROTATION_REQUIRED`: Encryption version outdated

## Migration Guide

### From Unencrypted Data

1. **Phase 1**: Deploy encryption infrastructure
2. **Phase 2**: Migrate existing data
3. **Phase 3**: Enable encryption for new data
4. **Phase 4**: Remove unencrypted data

### Key Rotation

1. **Preparation**: Generate new keys
2. **Deployment**: Update key configuration
3. **Migration**: Re-encrypt data with new keys
4. **Cleanup**: Remove old keys securely

---

For questions or support regarding the encryption implementation, please refer to the security team documentation or create a security-tagged issue in the project repository.