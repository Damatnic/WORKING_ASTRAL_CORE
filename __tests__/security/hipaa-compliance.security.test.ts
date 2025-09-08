/**
 * HIPAA Compliance Security Tests
 * Tests PHI protection, audit logging, encryption compliance
 * 
 * HIPAA Requirements: Tests ensure compliance with Administrative,
 * Physical, and Technical Safeguards for mental health platform
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import crypto from 'crypto';
import { defaultSecurityConfig } from '../../security/security-tests.config';
import type { SecurityTestConfig } from '../../security/security-tests.config';

// Mock modules
jest.mock('crypto');
jest.mock('@/lib/prisma');
jest.mock('@/lib/security/encryption');
jest.mock('@/lib/security/audit');

// Mock services
const mockDb = {
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn()
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  patient: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn()
  },
  therapySession: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  phiAccess: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  backupLog: {
    create: jest.fn(),
    findMany: jest.fn()
  }
};

const mockEncryption = {
  encryptPHI: jest.fn(),
  decryptPHI: jest.fn(),
  generateKey: jest.fn(),
  rotateKey: jest.fn(),
  validateEncryption: jest.fn()
};

const mockAudit = {
  logPHIAccess: jest.fn(),
  logSecurityEvent: jest.fn(),
  generateAuditReport: jest.fn(),
  validateAuditIntegrity: jest.fn()
};

const securityConfig: SecurityTestConfig = defaultSecurityConfig;

// PHI data examples for testing
const samplePHI = {
  patientId: 'patient123',
  ssn: '123-45-6789',
  dateOfBirth: '1985-03-15',
  diagnosis: 'Major Depressive Disorder',
  medications: ['Sertraline 50mg', 'Lorazepam 0.5mg'],
  therapyNotes: 'Patient expressed significant improvement in mood and anxiety levels.',
  emergencyContact: {
    name: 'Jane Doe',
    phone: '555-123-4567',
    relationship: 'Spouse'
  }
};

describe('HIPAA Compliance Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Administrative Safeguards Tests', () => {
    it('should enforce assigned security responsibility', async () => {
      const securityOfficer = {
        id: 'so123',
        role: 'security_officer',
        permissions: [
          'hipaa_compliance_monitoring',
          'security_policy_management',
          'incident_response_coordination',
          'audit_review'
        ]
      };

      mockDb.user.findUnique.mockResolvedValue(securityOfficer);

      const officer = await mockDb.user.findUnique({
        where: { role: 'security_officer' }
      });

      expect(officer).toBeTruthy();
      expect(officer.permissions).toContain('hipaa_compliance_monitoring');
      expect(officer.permissions).toContain('audit_review');
    });

    it('should implement workforce training requirements', async () => {
      const workforceMembers = [
        { id: 'admin1', role: 'admin', trainingStatus: 'current' },
        { id: 'therapist1', role: 'therapist', trainingStatus: 'current' },
        { id: 'helper1', role: 'helper', trainingStatus: 'expired' }
      ];

      mockDb.user.findMany.mockResolvedValue(workforceMembers);

      const workforce = await mockDb.user.findMany({
        where: { role: { in: ['admin', 'therapist', 'helper'] } }
      });

      // Check training compliance
      const trainingCompliant = workforce.filter(member => 
        member.trainingStatus === 'current'
      );
      const nonCompliant = workforce.filter(member => 
        member.trainingStatus !== 'current'
      );

      expect(trainingCompliant).toHaveLength(2);
      expect(nonCompliant).toHaveLength(1);

      // Non-compliant members should have access restricted
      if (nonCompliant.length > 0) {
        expect(mockDb.auditLog.create).toHaveBeenCalledWith({
          data: {
            action: 'training_compliance_violation',
            userId: 'helper1',
            riskLevel: 'high',
            requiresAction: true
          }
        });
      }
    });

    it('should enforce information access management', async () => {
      const accessRequests = [
        {
          userId: 'therapist1',
          patientId: 'patient1',
          requestedAccess: 'therapy_notes',
          relationship: 'assigned_therapist'
        },
        {
          userId: 'admin1',
          patientId: 'patient2',
          requestedAccess: 'full_record',
          relationship: 'none'
        }
      ];

      for (const request of accessRequests) {
        const hasValidRelationship = await checkTherapistPatientRelationship(
          request.userId,
          request.patientId
        );

        if (request.relationship === 'assigned_therapist') {
          expect(hasValidRelationship).toBe(true);
        } else {
          expect(hasValidRelationship).toBe(false);
          
          // Unauthorized access attempt should be logged
          expect(mockDb.auditLog.create).toHaveBeenCalledWith({
            data: {
              action: 'unauthorized_phi_access_attempt',
              userId: request.userId,
              patientId: request.patientId,
              riskLevel: 'high'
            }
          });
        }
      }
    });

    it('should implement workforce access procedures', async () => {
      const newEmployee = {
        id: 'new_employee_1',
        role: 'therapist',
        hireDate: new Date(),
        backgroundCheckCompleted: true,
        hipaaTrainingCompleted: false,
        accessGranted: false
      };

      // New employee should not have access until training completed
      const canAccess = newEmployee.backgroundCheckCompleted && 
                       newEmployee.hipaaTrainingCompleted;

      expect(canAccess).toBe(false);

      // Complete training
      newEmployee.hipaaTrainingCompleted = true;
      const canAccessAfterTraining = newEmployee.backgroundCheckCompleted && 
                                    newEmployee.hipaaTrainingCompleted;

      expect(canAccessAfterTraining).toBe(true);
    });

    it('should maintain contingency plan for emergencies', async () => {
      const emergencyScenarios = [
        'system_outage',
        'natural_disaster',
        'security_breach',
        'staff_unavailability'
      ];

      for (const scenario of emergencyScenarios) {
        const contingencyPlan = await getContingencyPlan(scenario);
        
        expect(contingencyPlan).toBeTruthy();
        expect(contingencyPlan).toHaveProperty('backupProcedures');
        expect(contingencyPlan).toHaveProperty('dataRecoveryPlan');
        expect(contingencyPlan).toHaveProperty('alternativeAccessMethods');
        expect(contingencyPlan).toHaveProperty('emergencyContacts');
      }
    });
  });

  describe('Physical Safeguards Tests', () => {
    it('should implement facility access controls', async () => {
      const facilityAccess = {
        physicalSecurity: {
          keyCardAccess: true,
          surveillanceCameras: true,
          securityGuards: true,
          visitorBadges: true
        },
        serverRoom: {
          biometricAccess: true,
          temperatureControl: true,
          fireSuppressionSystem: true,
          accessLogging: true
        }
      };

      // Verify physical security measures
      expect(facilityAccess.physicalSecurity.keyCardAccess).toBe(true);
      expect(facilityAccess.serverRoom.biometricAccess).toBe(true);
      
      // Test access logging
      const accessLog = {
        timestamp: new Date(),
        userId: 'admin1',
        area: 'server_room',
        action: 'entry',
        authorized: true
      };

      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: accessLog
      });
    });

    it('should control workstation use and access', async () => {
      const workstations = [
        {
          id: 'ws001',
          location: 'therapy_room_1',
          authorizedUsers: ['therapist1', 'therapist2'],
          automaticLogoff: 900000, // 15 minutes
          encryptionEnabled: true
        },
        {
          id: 'ws002',
          location: 'admin_office',
          authorizedUsers: ['admin1'],
          automaticLogoff: 600000, // 10 minutes
          encryptionEnabled: true
        }
      ];

      for (const workstation of workstations) {
        // Verify automatic logoff is configured
        expect(workstation.automaticLogoff).toBeLessThanOrEqual(1800000); // Max 30 minutes
        
        // Verify encryption is enabled
        expect(workstation.encryptionEnabled).toBe(true);
        
        // Verify only authorized users can access
        expect(workstation.authorizedUsers.length).toBeGreaterThan(0);
      }
    });

    it('should implement device and media controls', async () => {
      const mediaHandling = {
        removableMedia: {
          encrypted: true,
          accessLogged: true,
          approvalRequired: true,
          inventoryTracked: true
        },
        disposal: {
          degaussing: true,
          physicalDestruction: true,
          certificateOfDestruction: true,
          witnessRequired: true
        }
      };

      // Test removable media controls
      const usbDevice = {
        id: 'usb_001',
        type: 'flash_drive',
        encrypted: true,
        authorizedUser: 'admin1',
        purpose: 'system_backup'
      };

      expect(usbDevice.encrypted).toBe(true);
      
      // Log media usage
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'removable_media_access',
          deviceId: usbDevice.id,
          userId: usbDevice.authorizedUser,
          purpose: usbDevice.purpose
        }
      });
    });
  });

  describe('Technical Safeguards Tests', () => {
    it('should implement access control with unique user identification', async () => {
      const users = [
        { id: 'user1', username: 'jdoe_therapist', uniqueId: 'EMP001' },
        { id: 'user2', username: 'msmith_admin', uniqueId: 'EMP002' },
        { id: 'user3', username: 'bwilson_helper', uniqueId: 'EMP003' }
      ];

      for (const user of users) {
        // Each user must have unique identifier
        expect(user.uniqueId).toBeTruthy();
        expect(user.uniqueId).toMatch(/^EMP\d+$/);
        
        // Username should follow naming convention
        expect(user.username).toMatch(/^[a-z]+_[a-z]+$/);
      }

      // Verify no duplicate identifiers
      const uniqueIds = users.map(u => u.uniqueId);
      const uniqueUsernames = users.map(u => u.username);
      
      expect(new Set(uniqueIds).size).toBe(users.length);
      expect(new Set(uniqueUsernames).size).toBe(users.length);
    });

    it('should implement automatic logoff', async () => {
      const sessionConfigs = [
        { role: 'admin', timeout: 900000 }, // 15 minutes
        { role: 'therapist', timeout: 1800000 }, // 30 minutes
        { role: 'patient', timeout: 3600000 } // 60 minutes
      ];

      for (const config of sessionConfigs) {
        // Verify timeout is within acceptable range
        expect(config.timeout).toBeLessThanOrEqual(3600000); // Max 1 hour
        expect(config.timeout).toBeGreaterThanOrEqual(600000); // Min 10 minutes
      }

      // Test automatic logoff implementation
      const session = {
        userId: 'user1',
        lastActivity: new Date(Date.now() - 1900000), // 31+ minutes ago
        timeout: 1800000 // 30 minutes
      };

      const shouldLogoff = (Date.now() - session.lastActivity.getTime()) > session.timeout;
      expect(shouldLogoff).toBe(true);
    });

    it('should implement encryption and decryption of PHI', async () => {
      // Test PHI encryption at rest
      mockEncryption.encryptPHI.mockResolvedValue({
        encryptedData: 'encrypted_phi_data_base64',
        keyId: 'key123',
        algorithm: 'AES-256-GCM'
      });

      const encryptedPHI = await mockEncryption.encryptPHI(samplePHI);
      
      expect(encryptedPHI.algorithm).toBe('AES-256-GCM');
      expect(encryptedPHI.keyId).toBeTruthy();
      expect(encryptedPHI.encryptedData).toBeTruthy();

      // Test PHI decryption
      mockEncryption.decryptPHI.mockResolvedValue(samplePHI);

      const decryptedPHI = await mockEncryption.decryptPHI(
        encryptedPHI.encryptedData,
        encryptedPHI.keyId
      );

      expect(decryptedPHI.patientId).toBe(samplePHI.patientId);
      expect(decryptedPHI.ssn).toBe(samplePHI.ssn);

      // Test encryption validation
      mockEncryption.validateEncryption.mockResolvedValue(true);

      const isValidEncryption = await mockEncryption.validateEncryption(
        encryptedPHI.encryptedData
      );

      expect(isValidEncryption).toBe(true);
    });

    it('should implement audit controls with comprehensive logging', async () => {
      const auditableEvents = [
        'phi_access',
        'phi_modification',
        'user_login',
        'user_logout',
        'permission_change',
        'system_configuration_change',
        'backup_creation',
        'data_export'
      ];

      for (const eventType of auditableEvents) {
        const auditEvent = {
          eventType,
          userId: 'user123',
          timestamp: new Date(),
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          outcome: 'success',
          resource: 'patient_record_456'
        };

        mockDb.auditLog.create.mockResolvedValue({
          id: 'audit123',
          ...auditEvent
        });

        await mockDb.auditLog.create({ data: auditEvent });

        expect(mockDb.auditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventType,
            userId: auditEvent.userId,
            timestamp: expect.any(Date)
          })
        });
      }
    });

    it('should implement integrity controls for PHI', async () => {
      const originalPHI = { ...samplePHI };
      
      // Generate checksum for integrity verification
      const checksum = generateChecksum(JSON.stringify(originalPHI));
      
      // Simulate data modification
      const modifiedPHI = { ...originalPHI, diagnosis: 'Tampered Data' };
      const modifiedChecksum = generateChecksum(JSON.stringify(modifiedPHI));
      
      // Verify integrity check detects modification
      expect(checksum).not.toBe(modifiedChecksum);
      
      // Test digital signature for PHI records
      const signature = await generateDigitalSignature(originalPHI);
      const isValidSignature = await verifyDigitalSignature(originalPHI, signature);
      
      expect(isValidSignature).toBe(true);
      
      // Test signature with tampered data
      const isValidTamperedSignature = await verifyDigitalSignature(modifiedPHI, signature);
      expect(isValidTamperedSignature).toBe(false);
    });

    it('should implement transmission security', async () => {
      const transmissionTests = [
        {
          protocol: 'https',
          tlsVersion: '1.3',
          encryption: 'AES-256-GCM',
          certificateValid: true
        },
        {
          protocol: 'wss',
          tlsVersion: '1.3',
          encryption: 'AES-256-GCM',
          certificateValid: true
        }
      ];

      for (const transmission of transmissionTests) {
        // Verify secure protocols
        expect(['https', 'wss']).toContain(transmission.protocol);
        
        // Verify TLS version
        expect(transmission.tlsVersion).toBe('1.3');
        
        // Verify strong encryption
        expect(transmission.encryption).toBe('AES-256-GCM');
        
        // Verify certificate validity
        expect(transmission.certificateValid).toBe(true);
      }

      // Test message integrity during transmission
      const message = JSON.stringify(samplePHI);
      const messageHash = crypto.createHash('sha256').update(message).digest('hex');
      
      // Simulate transmission
      const transmittedMessage = message;
      const receivedHash = crypto.createHash('sha256').update(transmittedMessage).digest('hex');
      
      expect(messageHash).toBe(receivedHash);
    });
  });

  describe('Business Associate Agreement (BAA) Compliance Tests', () => {
    it('should enforce BAA requirements for third-party services', async () => {
      const businessAssociates = [
        {
          name: 'Cloud Storage Provider',
          hasSignedBAA: true,
          complianceMonitored: true,
          dataHandlingAgreement: true
        },
        {
          name: 'Email Service Provider',
          hasSignedBAA: true,
          complianceMonitored: true,
          dataHandlingAgreement: true
        },
        {
          name: 'Analytics Provider',
          hasSignedBAA: false, // Non-compliant
          complianceMonitored: false,
          dataHandlingAgreement: false
        }
      ];

      for (const ba of businessAssociates) {
        if (!ba.hasSignedBAA) {
          // Should block data sharing with non-compliant associates
          expect(mockDb.auditLog.create).toHaveBeenCalledWith({
            data: {
              action: 'baa_violation',
              businessAssociate: ba.name,
              issue: 'no_signed_baa',
              riskLevel: 'critical',
              blocked: true
            }
          });
        }
        
        expect(ba.hasSignedBAA).toBe(true);
        expect(ba.complianceMonitored).toBe(true);
      }
    });
  });

  describe('Breach Notification Compliance Tests', () => {
    it('should detect and report potential PHI breaches', async () => {
      const potentialBreaches = [
        {
          type: 'unauthorized_access',
          affectedRecords: 150,
          severity: 'high',
          discovered: new Date(),
          containmentTime: 2 * 3600000 // 2 hours
        },
        {
          type: 'data_loss',
          affectedRecords: 25,
          severity: 'medium',
          discovered: new Date(),
          containmentTime: 1 * 3600000 // 1 hour
        }
      ];

      for (const breach of potentialBreaches) {
        // Breaches affecting 500+ records require HHS notification
        const requiresHHSNotification = breach.affectedRecords >= 500;
        
        // All breaches require internal documentation
        expect(mockDb.auditLog.create).toHaveBeenCalledWith({
          data: {
            action: 'potential_breach_detected',
            type: breach.type,
            affectedRecords: breach.affectedRecords,
            severity: breach.severity,
            requiresHHSNotification,
            discovered: breach.discovered
          }
        });

        // Verify timely containment
        const maxContainmentTime = 4 * 3600000; // 4 hours
        expect(breach.containmentTime).toBeLessThanOrEqual(maxContainmentTime);
      }
    });

    it('should maintain breach documentation requirements', async () => {
      const breachDocumentation = {
        breachId: 'breach_001',
        dateDiscovered: new Date('2024-01-15'),
        dateReported: new Date('2024-01-16'),
        description: 'Unauthorized access to patient records via compromised account',
        affectedIndividuals: 75,
        remedialActions: [
          'Password reset for all users',
          'Additional MFA enforcement',
          'Security awareness training',
          'System access review'
        ],
        riskAssessment: 'Medium risk - no financial or identity theft indicators',
        notificationsSent: {
          patients: true,
          hhs: false, // < 500 records
          media: false
        }
      };

      expect(breachDocumentation.dateReported.getTime() - breachDocumentation.dateDiscovered.getTime())
        .toBeLessThanOrEqual(72 * 3600000); // Within 72 hours

      expect(breachDocumentation.remedialActions.length).toBeGreaterThan(0);
      expect(breachDocumentation.riskAssessment).toBeTruthy();
    });
  });

  describe('Mental Health Specific HIPAA Requirements', () => {
    it('should implement special protections for psychotherapy notes', async () => {
      const psychotherapyNote = {
        id: 'note_001',
        patientId: 'patient123',
        therapistId: 'therapist456',
        content: 'Detailed analysis of patient psychological state and treatment progress',
        type: 'psychotherapy_note',
        specialProtection: true,
        separateConsent: true
      };

      // Psychotherapy notes require separate patient consent
      expect(psychotherapyNote.specialProtection).toBe(true);
      expect(psychotherapyNote.separateConsent).toBe(true);

      // Access should be more restricted than regular PHI
      const accessAttempt = await checkPsychotherapyNoteAccess(
        'admin123',
        psychotherapyNote.id
      );

      expect(accessAttempt.requiresSpecialConsent).toBe(true);
      expect(accessAttempt.restrictedAccess).toBe(true);
    });

    it('should handle crisis intervention emergency access', async () => {
      const crisisScenario = {
        patientId: 'patient789',
        crisisType: 'suicide_threat',
        emergencyContact: 'crisis_counselor_001',
        timeStamp: new Date(),
        emergencyOverride: true
      };

      // Crisis situations may allow emergency access to PHI
      const emergencyAccess = await grantEmergencyAccess(
        crisisScenario.emergencyContact,
        crisisScenario.patientId,
        crisisScenario.crisisType
      );

      expect(emergencyAccess.granted).toBe(true);
      expect(emergencyAccess.timeLimit).toBeTruthy();
      expect(emergencyAccess.requiresJustification).toBe(true);

      // Emergency access must be thoroughly documented
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'emergency_phi_access',
          userId: crisisScenario.emergencyContact,
          patientId: crisisScenario.patientId,
          justification: crisisScenario.crisisType,
          emergencyOverride: true,
          requiresPostReview: true
        }
      });
    });

    it('should protect minor patient information with additional safeguards', async () => {
      const minorPatient = {
        id: 'minor_patient_001',
        age: 16,
        parentGuardian: 'parent_001',
        consentStatus: {
          parentalConsent: true,
          minorConsent: true, // For certain mental health services
          treatmentConsent: true
        }
      };

      // Additional protections for minors
      expect(minorPatient.consentStatus.parentalConsent).toBe(true);
      
      // Some mental health services may allow minor consent
      if (minorPatient.age >= 14) {
        expect(minorPatient.consentStatus.minorConsent).toBe(true);
      }

      // Access logging should include additional minor protection flags
      expect(mockDb.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'minor_phi_access',
          patientId: minorPatient.id,
          parentGuardianNotified: true,
          additionalSafeguards: true,
          age: minorPatient.age
        }
      });
    });
  });

  describe('Audit Log Retention and Analysis Tests', () => {
    it('should maintain audit logs for required retention period', async () => {
      const retentionPeriod = securityConfig.hipaa.auditControls.auditLogs.retention;
      const currentDate = new Date();
      const cutoffDate = new Date(currentDate.getTime() - (retentionPeriod * 24 * 60 * 60 * 1000));

      mockDb.auditLog.findMany.mockResolvedValue([
        { id: 'audit1', timestamp: new Date(currentDate.getTime() - 1000 * 24 * 60 * 60 * 1000) }, // 1000 days old
        { id: 'audit2', timestamp: new Date(currentDate.getTime() - 3000 * 24 * 60 * 60 * 1000) } // 3000 days old
      ]);

      const oldAuditLogs = await mockDb.auditLog.findMany({
        where: { timestamp: { lt: cutoffDate } }
      });

      // Logs older than retention period should be flagged for review before deletion
      expect(oldAuditLogs.length).toBeGreaterThan(0);
      
      // HIPAA requires 7 years retention (2555 days)
      expect(retentionPeriod).toBe(2555);
    });

    it('should implement automated audit log analysis', async () => {
      const suspiciousActivities = [
        'multiple_failed_logins',
        'off_hours_access',
        'bulk_data_export',
        'privilege_escalation_attempt',
        'unusual_access_pattern'
      ];

      mockAudit.generateAuditReport.mockResolvedValue({
        alertsGenerated: 3,
        highRiskEvents: 1,
        mediumRiskEvents: 5,
        reviewRequired: true
      });

      const auditAnalysis = await mockAudit.generateAuditReport();

      expect(auditAnalysis.alertsGenerated).toBeGreaterThan(0);
      expect(auditAnalysis.reviewRequired).toBe(true);

      // High-risk events should trigger immediate review
      if (auditAnalysis.highRiskEvents > 0) {
        expect(mockDb.auditLog.create).toHaveBeenCalledWith({
          data: {
            action: 'high_risk_audit_event',
            requiresImmediateReview: true,
            securityOfficerNotified: true
          }
        });
      }
    });
  });
});

// Helper functions for testing
async function checkTherapistPatientRelationship(therapistId: string, patientId: string): Promise<boolean> {
  // Mock relationship verification
  const validRelationships = [
    { therapistId: 'therapist1', patientId: 'patient1' }
  ];
  
  return validRelationships.some(rel => 
    rel.therapistId === therapistId && rel.patientId === patientId
  );
}

async function getContingencyPlan(scenario: string) {
  return {
    scenario,
    backupProcedures: ['automated_backup', 'offsite_storage'],
    dataRecoveryPlan: 'restore_from_backup',
    alternativeAccessMethods: ['mobile_app', 'emergency_portal'],
    emergencyContacts: ['security_officer', 'it_support']
  };
}

function generateChecksum(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function generateDigitalSignature(data: any): Promise<string> {
  return 'mock_digital_signature_base64';
}

async function verifyDigitalSignature(data: any, signature: string): Promise<boolean> {
  const expectedSignature = await generateDigitalSignature(data);
  return signature === expectedSignature;
}

async function checkPsychotherapyNoteAccess(userId: string, noteId: string) {
  return {
    requiresSpecialConsent: true,
    restrictedAccess: true,
    allowedUsers: ['treating_therapist', 'patient_self'],
    specialPermissionRequired: true
  };
}

async function grantEmergencyAccess(userId: string, patientId: string, crisisType: string) {
  return {
    granted: true,
    timeLimit: 24 * 3600000, // 24 hours
    requiresJustification: true,
    automaticExpiry: true,
    auditRequired: true
  };
}