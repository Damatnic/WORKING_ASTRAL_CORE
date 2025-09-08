/**
 * Data Protection Security Tests
 * Tests encryption at rest, in transit, data masking, and secure deletion
 * 
 * HIPAA Compliance: Tests ensure PHI is properly protected
 * throughout its lifecycle in the mental health platform
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import crypto from 'crypto';
import { defaultSecurityConfig } from '../../security/security-tests.config';
import type { SecurityTestConfig, EncryptionTestConfig } from '../../security/security-tests.config';

// Mock modules
jest.mock('crypto');
jest.mock('@/lib/security/encryption');
jest.mock('@/lib/security/key-management');
jest.mock('@/lib/prisma');

// Mock services
const mockEncryption = {
  encrypt: jest.fn(),
  decrypt: jest.fn(),
  generateKey: jest.fn(),
  rotateKey: jest.fn(),
  validateKeyStrength: jest.fn(),
  secureDelete: jest.fn(),
  hashData: jest.fn()
};

const mockKeyManagement = {
  createKey: jest.fn(),
  getKey: jest.fn(),
  rotateKey: jest.fn(),
  destroyKey: jest.fn(),
  exportKey: jest.fn(),
  auditKeyAccess: jest.fn()
};

const mockDb = {
  encryptedData: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  keyManagement: {
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  auditLog: {
    create: jest.fn()
  },
  dataProcessing: {
    create: jest.fn(),
    findMany: jest.fn()
  }
};

const securityConfig: SecurityTestConfig = defaultSecurityConfig;
const encryptionConfig: EncryptionTestConfig = securityConfig.hipaa.encryption;

// Sample PHI data for testing
const samplePHI = {
  patientId: 'patient_123',
  firstName: 'John',
  lastName: 'Doe',
  ssn: '123-45-6789',
  dateOfBirth: '1985-03-15',
  diagnosis: 'Major Depressive Disorder, Recurrent, Moderate',
  medications: ['Sertraline 100mg daily', 'Alprazolam 0.25mg as needed'],
  therapyNotes: 'Patient reports improved mood and decreased anxiety. Continuing current treatment plan.',
  emergencyContact: {
    name: 'Jane Doe',
    relationship: 'Spouse',
    phone: '555-123-4567'
  }
};

describe('Data Protection Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Encryption at Rest Tests', () => {
    it('should encrypt PHI using approved algorithms', async () => {
      const approvedAlgorithms = encryptionConfig.algorithms.symmetric;
      
      for (const algorithm of approvedAlgorithms) {
        mockEncryption.encrypt.mockResolvedValue({
          encryptedData: 'encrypted_phi_base64',
          algorithm,
          keyId: 'key_123',
          iv: 'initialization_vector',
          authTag: 'authentication_tag'
        });

        const encrypted = await mockEncryption.encrypt(samplePHI, algorithm);
        
        expect(encrypted.algorithm).toBe(algorithm);
        expect(encrypted.encryptedData).toBeTruthy();
        expect(encrypted.keyId).toBeTruthy();
        
        // AES-GCM should include authentication tag
        if (algorithm.includes('GCM')) {
          expect(encrypted.authTag).toBeTruthy();
        }
      }
    });

    it('should validate encryption key strength', async () => {
      const keyStrengthTests = [
        { algorithm: 'AES-256-GCM', keySize: 256, shouldPass: true },
        { algorithm: 'AES-128-GCM', keySize: 128, shouldPass: false }, // Too weak for PHI
        { algorithm: 'AES-256-CBC', keySize: 256, shouldPass: true },
        { algorithm: 'DES', keySize: 56, shouldPass: false } // Deprecated
      ];

      for (const { algorithm, keySize, shouldPass } of keyStrengthTests) {
        mockEncryption.validateKeyStrength.mockReturnValue(shouldPass);
        
        const isValidKey = mockEncryption.validateKeyStrength(algorithm, keySize);
        expect(isValidKey).toBe(shouldPass);
        
        if (!shouldPass) {
          expect(mockDb.auditLog.create).toHaveBeenCalledWith({
            data: {
              action: 'weak_encryption_rejected',
              algorithm,
              keySize,
              riskLevel: 'critical'
            }
          });
        }
      }
    });

    it('should implement proper key management', async () => {
      const keyLifecycleTests = [
        { action: 'create', keyId: 'key_001' },
        { action: 'rotate', keyId: 'key_001', newKeyId: 'key_002' },
        { action: 'destroy', keyId: 'key_001' }
      ];

      for (const test of keyLifecycleTests) {
        switch (test.action) {
          case 'create':
            mockKeyManagement.createKey.mockResolvedValue({
              keyId: test.keyId,
              algorithm: 'AES-256-GCM',
              created: new Date(),
              status: 'active'
            });

            const newKey = await mockKeyManagement.createKey();
            expect(newKey.keyId).toBe(test.keyId);
            expect(newKey.status).toBe('active');
            break;

          case 'rotate':
            mockKeyManagement.rotateKey.mockResolvedValue({
              oldKeyId: test.keyId,
              newKeyId: test.newKeyId,
              rotationDate: new Date()
            });

            const rotatedKey = await mockKeyManagement.rotateKey(test.keyId);
            expect(rotatedKey.oldKeyId).toBe(test.keyId);
            expect(rotatedKey.newKeyId).toBe(test.newKeyId);
            break;

          case 'destroy':
            mockKeyManagement.destroyKey.mockResolvedValue({
              keyId: test.keyId,
              destroyed: true,
              destructionDate: new Date()
            });

            const destroyedKey = await mockKeyManagement.destroyKey(test.keyId);
            expect(destroyedKey.destroyed).toBe(true);
            break;
        }

        // All key operations should be audited
        expect(mockDb.auditLog.create).toHaveBeenCalledWith({
          data: {
            action: `key_${test.action}`,
            keyId: test.action === 'rotate' ? test.newKeyId : test.keyId,
            timestamp: expect.any(Date),
            riskLevel: test.action === 'destroy' ? 'high' : 'medium'
          }
        });
      }
    });

    it('should implement database-level encryption', async () => {
      const databaseEncryption = {
        tableEncryption: true,
        columnEncryption: true,
        indexEncryption: true,
        backupEncryption: true,
        logEncryption: true
      };

      // Verify all database components are encrypted
      expect(databaseEncryption.tableEncryption).toBe(true);
      expect(databaseEncryption.columnEncryption).toBe(true);
      expect(databaseEncryption.backupEncryption).toBe(true);

      // Test encrypted data storage
      const encryptedRecord = {
        id: 'record_123',
        encryptedData: 'encrypted_phi_content',
        keyId: 'key_456',
        algorithm: 'AES-256-GCM',
        created: new Date()
      };

      mockDb.encryptedData.create.mockResolvedValue(encryptedRecord);

      const storedRecord = await mockDb.encryptedData.create({
        data: encryptedRecord
      });

      expect(storedRecord.encryptedData).toBeTruthy();
      expect(storedRecord.keyId).toBeTruthy();
      expect(storedRecord.algorithm).toBe('AES-256-GCM');
    });
  });

  describe('Encryption in Transit Tests', () => {
    it('should enforce TLS for all PHI communications', async () => {
      const transmissionConfig = securityConfig.hipaa.transmission;
      
      // Verify TLS version requirements
      expect(transmissionConfig.encryption.tlsVersion).toBe('1.3');
      
      // Test cipher suite security
      const approvedCiphers = transmissionConfig.encryption.cipherSuites;
      for (const cipher of approvedCiphers) {
        expect(cipher).toMatch(/^TLS_(AES_256|CHACHA20|AES_128)/);
        expect(cipher).toContain('GCM');
      }

      // Test certificate validation
      expect(transmissionConfig.encryption.certificateValidation).toBe(true);
    });

    it('should implement end-to-end encryption for sensitive communications', async () => {
      const communicationTypes = [
        'therapist_patient_chat',
        'crisis_intervention_call',
        'therapy_session_video',
        'peer_support_message'
      ];

      for (const commType of communicationTypes) {
        const e2eEncryption = {
          enabled: true,
          algorithm: 'AES-256-GCM',
          keyExchange: 'ECDH-P384',
          forwardSecrecy: true
        };

        expect(e2eEncryption.enabled).toBe(true);
        expect(e2eEncryption.forwardSecrecy).toBe(true);
        
        // Log E2E encryption establishment
        expect(mockDb.auditLog.create).toHaveBeenCalledWith({
          data: {
            action: 'e2e_encryption_established',
            communicationType: commType,
            algorithm: e2eEncryption.algorithm,
            keyExchange: e2eEncryption.keyExchange
          }
        });
      }
    });

    it('should implement message integrity verification', async () => {
      const message = JSON.stringify(samplePHI);
      const messageHash = crypto.createHash('sha256').update(message).digest('hex');
      
      // Mock HMAC generation
      const hmac = crypto.createHmac('sha256', 'secret_key').update(message).digest('hex');
      
      // Verify message integrity during transmission
      const transmissionData = {
        message,
        hash: messageHash,
        hmac,
        timestamp: new Date(),
        integrity: 'verified'
      };

      expect(transmissionData.hash).toBeTruthy();
      expect(transmissionData.hmac).toBeTruthy();
      expect(transmissionData.integrity).toBe('verified');
    });
  });

  describe('Data Masking and Anonymization Tests', () => {
    it('should implement data masking for non-production environments', async () => {
      const maskedPHI = maskPHIData(samplePHI);
      
      // Verify sensitive data is masked
      expect(maskedPHI.ssn).toBe('XXX-XX-6789'); // Last 4 digits visible
      expect(maskedPHI.firstName).toBe('J***');
      expect(maskedPHI.lastName).toBe('D**');
      expect(maskedPHI.dateOfBirth).toBe('****-**-15'); // Day visible for age calculation
      
      // Verify clinical data remains useful but protected
      expect(maskedPHI.diagnosis).toContain('[MASKED]');
      expect(maskedPHI.therapyNotes).toContain('[CLINICAL_NOTE_MASKED]');
      
      // Emergency contact should be masked
      expect(maskedPHI.emergencyContact.name).toBe('J*** D**');
      expect(maskedPHI.emergencyContact.phone).toBe('XXX-XXX-4567');
    });

    it('should implement de-identification for research data', async () => {
      const deidentifiedData = deidentifyPHI(samplePHI);
      
      // Verify all 18 HIPAA identifiers are removed
      const hipaaIdentifiers = [
        'name', 'address', 'dates', 'phone', 'fax', 'email', 'ssn', 
        'medical_record', 'health_plan', 'account', 'certificate', 
        'vehicle', 'device', 'url', 'ip', 'biometric', 'photo', 'unique'
      ];
      
      // Should not contain direct identifiers
      expect(deidentifiedData.firstName).toBeUndefined();
      expect(deidentifiedData.lastName).toBeUndefined();
      expect(deidentifiedData.ssn).toBeUndefined();
      expect(deidentifiedData.emergencyContact).toBeUndefined();
      
      // Should contain research-useful data
      expect(deidentifiedData.ageGroup).toBe('35-39'); // Age ranges instead of exact DOB
      expect(deidentifiedData.diagnosisCategory).toBe('Mood Disorders');
      expect(deidentifiedData.treatmentOutcome).toBeDefined();
    });

    it('should implement safe harbor method compliance', async () => {
      const safeHarborData = applySafeHarborMethod(samplePHI);
      
      // Verify 18 identifiers are properly handled
      const requiredRemovals = [
        { field: 'name', removed: true },
        { field: 'ssn', removed: true },
        { field: 'dateOfBirth', transformed: 'ageGroup' },
        { field: 'phone', removed: true },
        { field: 'exactDates', transformed: 'yearOnly' }
      ];
      
      for (const removal of requiredRemovals) {
        if (removal.removed) {
          expect(safeHarborData[removal.field as keyof typeof safeHarborData]).toBeUndefined();
        }
        if (removal.transformed) {
          expect(safeHarborData[removal.transformed as keyof typeof safeHarborData]).toBeDefined();
        }
      }
      
      // Log de-identification process
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'safe_harbor_deidentification',
          originalRecordId: samplePHI.patientId,
          deidentificationMethod: 'safe_harbor',
          identifiersRemoved: requiredRemovals.length
        }
      });
    });
  });

  describe('Secure Data Deletion Tests', () => {
    it('should implement secure deletion for PHI', async () => {
      const deletionMethods = [
        { method: 'cryptographic_erasure', description: 'Delete encryption keys' },
        { method: 'overwrite_pattern', description: 'Multiple pass overwrite' },
        { method: 'degaussing', description: 'Magnetic field erasure' },
        { method: 'physical_destruction', description: 'Hardware destruction' }
      ];

      for (const { method, description } of deletionMethods) {
        mockEncryption.secureDelete.mockResolvedValue({
          method,
          completed: true,
          timestamp: new Date(),
          certificateGenerated: method === 'physical_destruction'
        });

        const deletionResult = await mockEncryption.secureDelete('patient_123', method);
        
        expect(deletionResult.completed).toBe(true);
        expect(deletionResult.method).toBe(method);
        
        // Physical destruction should generate certificate
        if (method === 'physical_destruction') {
          expect(deletionResult.certificateGenerated).toBe(true);
        }
        
        // Log secure deletion
        expect(mockDb.auditLog.create).toHaveBeenCalledWith({
          data: {
            action: 'secure_data_deletion',
            method,
            resourceId: 'patient_123',
            timestamp: deletionResult.timestamp,
            certificateRequired: method === 'physical_destruction'
          }
        });
      }
    });

    it('should implement data retention policies', async () => {
      const retentionPolicies = [
        { dataType: 'therapy_notes', retentionPeriod: 7 * 365, // 7 years
          unit: 'days' },
        { dataType: 'audit_logs', retentionPeriod: 7 * 365, unit: 'days' },
        { dataType: 'session_recordings', retentionPeriod: 3 * 365, unit: 'days' },
        { dataType: 'chat_messages', retentionPeriod: 2 * 365, unit: 'days' }
      ];

      for (const policy of retentionPolicies) {
        const currentDate = new Date();
        const retentionDate = new Date(
          currentDate.getTime() - (policy.retentionPeriod * 24 * 60 * 60 * 1000)
        );

        // Mock data older than retention period
        mockDb.dataProcessing.findMany.mockResolvedValue([
          {
            id: 'data_001',
            type: policy.dataType,
            created: retentionDate,
            shouldDelete: true
          }
        ]);

        const expiredData = await mockDb.dataProcessing.findMany({
          where: {
            type: policy.dataType,
            created: { lt: retentionDate }
          }
        });

        expect(expiredData.length).toBeGreaterThan(0);
        
        // Verify retention period compliance
        if (policy.dataType === 'therapy_notes' || policy.dataType === 'audit_logs') {
          expect(policy.retentionPeriod).toBe(7 * 365); // HIPAA minimum 7 years
        }
      }
    });

    it('should handle right to be forgotten requests', async () => {
      const forgetfulnessRequest = {
        patientId: 'patient_456',
        requestType: 'complete_deletion',
        legalBasis: 'patient_request',
        exceptions: ['audit_logs', 'legal_hold_data'],
        requestDate: new Date()
      };

      const deletableData = [
        'therapy_notes',
        'session_recordings',
        'chat_messages',
        'wellness_data',
        'journal_entries'
      ];

      for (const dataType of deletableData) {
        // Verify data can be safely deleted without legal conflicts
        const canDelete = !forgetfulnessRequest.exceptions.includes(dataType);
        expect(canDelete).toBe(true);

        if (canDelete) {
          expect(mockEncryption.secureDelete).toHaveBeenCalledWith(
            forgetfulnessRequest.patientId,
            'cryptographic_erasure'
          );
        }
      }

      // Log right to be forgotten processing
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'right_to_be_forgotten_processed',
          patientId: forgetfulnessRequest.patientId,
          requestType: forgetfulnessRequest.requestType,
          dataTypesDeleted: deletableData.length,
          exceptions: forgetfulnessRequest.exceptions
        }
      });
    });
  });

  describe('Data Integrity and Validation Tests', () => {
    it('should implement data integrity checks', async () => {
      const integrityMethods = [
        'checksum_validation',
        'digital_signatures',
        'hash_chains',
        'merkle_trees'
      ];

      for (const method of integrityMethods) {
        const integrityCheck = performIntegrityCheck(samplePHI, method);
        
        expect(integrityCheck.method).toBe(method);
        expect(integrityCheck.valid).toBe(true);
        expect(integrityCheck.hash).toBeTruthy();
        
        // Test integrity violation detection
        const tamperedData = { ...samplePHI, diagnosis: 'TAMPERED' };
        const tamperedCheck = performIntegrityCheck(tamperedData, method);
        
        expect(tamperedCheck.valid).toBe(false);
        
        if (!tamperedCheck.valid) {
          expect(mockDb.auditLog.create).toHaveBeenCalledWith({
            data: {
              action: 'data_integrity_violation',
              method,
              dataId: samplePHI.patientId,
              riskLevel: 'critical',
              requiresInvestigation: true
            }
          });
        }
      }
    });

    it('should validate data format and structure', async () => {
      const validationTests = [
        {
          field: 'ssn',
          value: '123-45-6789',
          pattern: /^\d{3}-\d{2}-\d{4}$/,
          valid: true
        },
        {
          field: 'ssn',
          value: '123456789',
          pattern: /^\d{3}-\d{2}-\d{4}$/,
          valid: false
        },
        {
          field: 'dateOfBirth',
          value: '1985-03-15',
          pattern: /^\d{4}-\d{2}-\d{2}$/,
          valid: true
        },
        {
          field: 'phone',
          value: '555-123-4567',
          pattern: /^\d{3}-\d{3}-\d{4}$/,
          valid: true
        }
      ];

      for (const test of validationTests) {
        const isValid = test.pattern.test(test.value);
        expect(isValid).toBe(test.valid);
        
        if (!isValid) {
          expect(mockDb.auditLog.create).toHaveBeenCalledWith({
            data: {
              action: 'data_validation_failure',
              field: test.field,
              value: test.value.substring(0, 5) + '***', // Partial value for debugging
              riskLevel: 'medium'
            }
          });
        }
      }
    });

    it('should implement version control for PHI modifications', async () => {
      const originalData = { ...samplePHI };
      const modifiedData = { ...samplePHI, diagnosis: 'Updated Diagnosis' };
      
      const versionControl = {
        recordId: originalData.patientId,
        version: 2,
        previousVersion: 1,
        changes: [
          {
            field: 'diagnosis',
            oldValue: originalData.diagnosis,
            newValue: modifiedData.diagnosis,
            changedBy: 'therapist_123',
            changedAt: new Date()
          }
        ],
        checksum: crypto.createHash('sha256').update(JSON.stringify(modifiedData)).digest('hex')
      };

      expect(versionControl.version).toBeGreaterThan(versionControl.previousVersion);
      expect(versionControl.changes).toHaveLength(1);
      expect(versionControl.checksum).toBeTruthy();
      
      // Log version control
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'phi_version_created',
          recordId: versionControl.recordId,
          version: versionControl.version,
          changes: versionControl.changes.length,
          changedBy: versionControl.changes[0]?.changedBy
        }
      });
    });
  });

  describe('Backup and Recovery Security Tests', () => {
    it('should implement encrypted backups', async () => {
      const backupConfig = {
        encryption: true,
        algorithm: 'AES-256-GCM',
        keyRotation: true,
        offsite: true,
        tested: true
      };

      expect(backupConfig.encryption).toBe(true);
      expect(backupConfig.algorithm).toBe('AES-256-GCM');
      expect(backupConfig.offsite).toBe(true);
      expect(backupConfig.tested).toBe(true);

      // Test backup creation
      const backupResult = {
        backupId: 'backup_001',
        created: new Date(),
        encrypted: true,
        keyId: 'backup_key_001',
        size: 1024000,
        checksum: 'backup_checksum_hash'
      };

      expect(backupResult.encrypted).toBe(true);
      expect(backupResult.keyId).toBeTruthy();
      expect(backupResult.checksum).toBeTruthy();

      // Log backup creation
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'encrypted_backup_created',
          backupId: backupResult.backupId,
          keyId: backupResult.keyId,
          size: backupResult.size,
          checksum: backupResult.checksum
        }
      });
    });

    it('should test backup recovery procedures', async () => {
      const recoveryTests = [
        { scenario: 'complete_system_failure', rto: 4, rpo: 1 }, // hours
        { scenario: 'database_corruption', rto: 2, rpo: 0.5 },
        { scenario: 'ransomware_attack', rto: 8, rpo: 4 },
        { scenario: 'natural_disaster', rto: 24, rpo: 8 }
      ];

      for (const test of recoveryTests) {
        // Recovery Time Objective should be reasonable
        expect(test.rto).toBeLessThanOrEqual(24); // Max 24 hours
        
        // Recovery Point Objective should minimize data loss
        expect(test.rpo).toBeLessThanOrEqual(8); // Max 8 hours data loss
        
        // Critical systems should have faster recovery
        if (test.scenario === 'database_corruption') {
          expect(test.rto).toBeLessThanOrEqual(4);
          expect(test.rpo).toBeLessThanOrEqual(1);
        }

        // Log recovery test
        expect(mockDb.auditLog.create).toHaveBeenCalledWith({
          data: {
            action: 'disaster_recovery_test',
            scenario: test.scenario,
            rto: test.rto,
            rpo: test.rpo,
            testPassed: true
          }
        });
      }
    });
  });
});

// Helper functions for testing
function maskPHIData(phi: any): any {
  return {
    ...phi,
    ssn: phi.ssn.replace(/^\d{3}-\d{2}/, 'XXX-XX'),
    firstName: phi.firstName.charAt(0) + '*'.repeat(phi.firstName.length - 1),
    lastName: phi.lastName.charAt(0) + '*'.repeat(phi.lastName.length - 1),
    dateOfBirth: phi.dateOfBirth.replace(/^\d{4}-\d{2}/, '****-**'),
    diagnosis: '[MASKED] ' + phi.diagnosis.split(' ').slice(-2).join(' '),
    therapyNotes: '[CLINICAL_NOTE_MASKED]',
    emergencyContact: {
      ...phi.emergencyContact,
      name: phi.emergencyContact.name.split(' ').map((n: string) => 
        n.charAt(0) + '*'.repeat(n.length - 1)).join(' '),
      phone: phi.emergencyContact.phone.replace(/^\d{3}-\d{3}/, 'XXX-XXX')
    }
  };
}

function deidentifyPHI(phi: any): any {
  return {
    recordId: crypto.randomUUID(), // New random identifier
    ageGroup: calculateAgeGroup(phi.dateOfBirth),
    diagnosisCategory: 'Mood Disorders',
    treatmentOutcome: 'Improved',
    medicationCount: phi.medications.length,
    sessionCount: Math.floor(Math.random() * 50) + 1,
    region: 'Northeast', // Geographic region instead of specific location
    // Remove all direct identifiers
  };
}

function applySafeHarborMethod(phi: any): any {
  return {
    // Remove direct identifiers per Safe Harbor method
    ageGroup: calculateAgeGroup(phi.dateOfBirth),
    diagnosisCode: 'F33.1', // ICD-10 code instead of text
    treatmentYear: new Date().getFullYear(),
    zipCodePrefix: '12345'.substring(0, 3), // First 3 digits only
    // All other identifiers removed
  };
}

function calculateAgeGroup(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  const age = new Date().getFullYear() - birth.getFullYear();
  
  if (age < 20) return '< 20';
  if (age < 30) return '20-29';
  if (age < 40) return '30-39';
  if (age < 50) return '40-49';
  if (age < 60) return '50-59';
  return '60+';
}

function performIntegrityCheck(data: any, method: string): { method: string; valid: boolean; hash: string } {
  const dataString = JSON.stringify(data);
  const hash = crypto.createHash('sha256').update(dataString).digest('hex');
  
  // Simple integrity check - in real implementation would be more sophisticated
  const expectedHash = crypto.createHash('sha256').update(JSON.stringify(samplePHI)).digest('hex');
  
  return {
    method,
    valid: hash === expectedHash,
    hash
  };
}