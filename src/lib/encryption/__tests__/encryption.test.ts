import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals'
import crypto from 'crypto'
import {
  encryptData,
  decryptData,
  hashIdentifier,
  sanitizeForLogging,
  generateSecureToken,
  validateEncryptedData,
  encryptField,
  decryptField,
  EncryptedField,
} from '../../../lib/encryption'
import { testConstants } from '@/lib/test-utils'

// Mock crypto module partially for controlled testing
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: jest.fn(),
}))

const mockCrypto = crypto as jest.Mocked<typeof crypto>

describe('Encryption Service', () => {
  const originalEncryptionKey = process.env.ENCRYPTION_KEY

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = testConstants.TEST_ENCRYPTION_KEY
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockCrypto.randomBytes.mockImplementation((size: number) => {
      return crypto.randomBytes(size) // Use actual randomBytes by default
    })
  })

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalEncryptionKey
  })

  describe('encryptData', () => {
    it('should encrypt string data successfully', () => {
      const testData = 'sensitive health information'
      
      const encrypted = encryptData(testData)
      
      expect(encrypted).toBeTruthy()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(testData)
      expect(encrypted.length).toBeGreaterThan(0)
    })

    it('should encrypt object data successfully', () => {
      const testData = {
        patientId: '12345',
        diagnosis: 'Depression',
        medication: 'Sertraline 50mg',
        notes: 'Patient responding well to treatment',
      }
      
      const encrypted = encryptData(testData)
      
      expect(encrypted).toBeTruthy()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toContain('Depression')
      expect(encrypted).not.toContain('Sertraline')
    })

    it('should produce different encrypted values for same input', () => {
      const testData = 'identical input data'
      
      const encrypted1 = encryptData(testData)
      const encrypted2 = encryptData(testData)
      
      expect(encrypted1).not.toBe(encrypted2)
      expect(encrypted1.length).toBe(encrypted2.length)
    })

    it('should handle empty string input', () => {
      const testData = ''
      
      const encrypted = encryptData(testData)
      
      expect(encrypted).toBeTruthy()
      expect(typeof encrypted).toBe('string')
    })

    it('should handle null and undefined inputs', () => {
      expect(() => encryptData(null)).not.toThrow()
      expect(() => encryptData(undefined)).not.toThrow()
    })

    it('should throw error when encryption key is missing', () => {
      delete process.env.ENCRYPTION_KEY
      
      expect(() => encryptData('test')).toThrow('ENCRYPTION_KEY is not set')
    })

    it('should handle encryption errors gracefully', () => {
      // Mock randomBytes to throw an error
      mockCrypto.randomBytes.mockImplementation(() => {
        throw new Error('Crypto operation failed')
      })
      
      expect(() => encryptData('test')).toThrow('Failed to encrypt data')
    })
  })

  describe('decryptData', () => {
    it('should decrypt string data successfully', () => {
      const originalData = 'confidential patient notes'
      
      const encrypted = encryptData(originalData)
      const decrypted = decryptData(encrypted)
      
      expect(decrypted).toBe(originalData)
    })

    it('should decrypt object data successfully', () => {
      const originalData = {
        sessionId: 'session_123',
        therapistNotes: 'Patient made significant progress',
        riskLevel: 'low',
        nextAppointment: '2024-02-15T10:00:00Z',
      }
      
      const encrypted = encryptData(originalData)
      const decrypted = decryptData(encrypted)
      
      expect(decrypted).toEqual(originalData)
    })

    it('should handle complex nested objects', () => {
      const originalData = {
        patient: {
          id: 'patient_456',
          profile: {
            name: 'John Doe',
            conditions: ['anxiety', 'depression'],
            medications: [
              { name: 'Fluoxetine', dosage: '20mg', frequency: 'daily' }
            ],
          },
        },
        sessions: [
          { date: '2024-01-01', notes: 'Initial assessment' },
          { date: '2024-01-08', notes: 'Follow-up session' },
        ],
      }
      
      const encrypted = encryptData(originalData)
      const decrypted = decryptData(encrypted)
      
      expect(decrypted).toEqual(originalData)
    })

    it('should throw error for invalid encrypted data', () => {
      const invalidEncrypted = 'invalid_base64_string'
      
      expect(() => decryptData(invalidEncrypted)).toThrow('Failed to decrypt data')
    })

    it('should throw error for tampered encrypted data', () => {
      const originalData = 'original data'
      const encrypted = encryptData(originalData)
      
      // Tamper with the encrypted data
      const tamperedData = encrypted.slice(0, -4) + 'XXXX'
      
      expect(() => decryptData(tamperedData)).toThrow('Failed to decrypt data')
    })

    it('should throw error when encryption key is missing', () => {
      const encrypted = encryptData('test data')
      delete process.env.ENCRYPTION_KEY
      
      expect(() => decryptData(encrypted)).toThrow('ENCRYPTION_KEY is not set')
    })

    it('should handle malformed encrypted data gracefully', () => {
      const malformedData = Buffer.from('malformed').toString('base64')
      
      expect(() => decryptData(malformedData)).toThrow('Failed to decrypt data')
    })
  })

  describe('hashIdentifier', () => {
    it('should create consistent hash for same input', () => {
      const identifier = 'patient-id-123'
      
      const hash1 = hashIdentifier(identifier)
      const hash2 = hashIdentifier(identifier)
      
      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 hex length
    })

    it('should create different hashes for different inputs', () => {
      const identifier1 = 'patient-id-123'
      const identifier2 = 'patient-id-456'
      
      const hash1 = hashIdentifier(identifier1)
      const hash2 = hashIdentifier(identifier2)
      
      expect(hash1).not.toBe(hash2)
    })

    it('should produce hex output', () => {
      const identifier = 'test-identifier'
      
      const hash = hashIdentifier(identifier)
      
      expect(hash).toMatch(/^[0-9a-f]+$/)
    })

    it('should handle empty string input', () => {
      const hash = hashIdentifier('')
      
      expect(hash).toBeTruthy()
      expect(hash).toHaveLength(64)
    })

    it('should include encryption key in hash', () => {
      const identifier = 'same-identifier'
      const originalKey = process.env.ENCRYPTION_KEY
      
      const hash1 = hashIdentifier(identifier)
      
      process.env.ENCRYPTION_KEY = 'different-key-for-testing'
      const hash2 = hashIdentifier(identifier)
      
      expect(hash1).not.toBe(hash2)
      
      process.env.ENCRYPTION_KEY = originalKey
    })
  })

  describe('sanitizeForLogging', () => {
    it('should redact sensitive fields', () => {
      const sensitiveData = {
        patientName: 'John Doe',
        password: 'secret123',
        ssn: '123-45-6789',
        email: 'john@example.com',
        diagnosis: 'Major Depression',
        publicInfo: 'This is safe to log',
      }
      
      const sanitized = sanitizeForLogging(sensitiveData)
      
      expect(sanitized.password).toBe('[REDACTED]')
      expect(sanitized.ssn).toBe('[REDACTED]')
      expect(sanitized.email).toBe('[REDACTED]')
      expect(sanitized.diagnosis).toBe('[REDACTED]')
      expect(sanitized.publicInfo).toBe('This is safe to log')
      expect(sanitized.patientName).toBe('John Doe') // Not in sensitive fields list
    })

    it('should handle nested objects', () => {
      const nestedData = {
        patient: {
          password: 'secret',
          profile: {
            email: 'test@example.com',
            preferences: 'user preferences',
          },
        },
        session: {
          notes: 'session notes',
        },
      }
      
      const sanitized = sanitizeForLogging(nestedData)
      
      // Only top-level fields are sanitized in current implementation
      expect(sanitized.patient.password).toBe('secret')
      expect(sanitized.patient.profile.email).toBe('test@example.com')
    })

    it('should handle null and undefined inputs', () => {
      expect(sanitizeForLogging(null)).toBeNull()
      expect(sanitizeForLogging(undefined)).toBeUndefined()
      expect(sanitizeForLogging({})).toEqual({})
    })

    it('should handle arrays', () => {
      const arrayData = [
        { password: 'secret1', publicData: 'data1' },
        { password: 'secret2', publicData: 'data2' },
      ]
      
      const sanitized = sanitizeForLogging(arrayData)
      
      expect(sanitized).toEqual(arrayData) // Arrays are not sanitized in current implementation
    })

    it('should handle primitive values', () => {
      expect(sanitizeForLogging('string')).toBe('string')
      expect(sanitizeForLogging(123)).toBe(123)
      expect(sanitizeForLogging(true)).toBe(true)
    })
  })

  describe('generateSecureToken', () => {
    it('should generate token of default length', () => {
      const token = generateSecureToken()
      
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token).toHaveLength(64) // 32 bytes = 64 hex chars
    })

    it('should generate token of specified length', () => {
      const length = 16
      const token = generateSecureToken(length)
      
      expect(token).toHaveLength(length * 2) // bytes * 2 for hex
    })

    it('should generate different tokens on each call', () => {
      const token1 = generateSecureToken()
      const token2 = generateSecureToken()
      
      expect(token1).not.toBe(token2)
    })

    it('should produce hex output', () => {
      const token = generateSecureToken(8)
      
      expect(token).toMatch(/^[0-9a-f]+$/)
    })

    it('should handle zero length input', () => {
      const token = generateSecureToken(0)
      
      expect(token).toBe('')
    })
  })

  describe('validateEncryptedData', () => {
    it('should validate correctly encrypted data', () => {
      const originalData = 'valid data for validation'
      const encrypted = encryptData(originalData)
      
      const isValid = validateEncryptedData(encrypted)
      
      expect(isValid).toBe(true)
    })

    it('should reject invalid encrypted data', () => {
      const invalidData = 'this-is-not-encrypted-data'
      
      const isValid = validateEncryptedData(invalidData)
      
      expect(isValid).toBe(false)
    })

    it('should reject tampered encrypted data', () => {
      const originalData = 'data to be tampered'
      const encrypted = encryptData(originalData)
      const tamperedData = encrypted.slice(0, -8) + 'TAMPERED'
      
      const isValid = validateEncryptedData(tamperedData)
      
      expect(isValid).toBe(false)
    })

    it('should reject empty string', () => {
      const isValid = validateEncryptedData('')
      
      expect(isValid).toBe(false)
    })

    it('should reject malformed base64', () => {
      const malformedBase64 = 'not-valid-base64!'
      
      const isValid = validateEncryptedData(malformedBase64)
      
      expect(isValid).toBe(false)
    })
  })

  describe('encryptField and decryptField', () => {
    it('should encrypt field with metadata', () => {
      const testData = 'field data to encrypt'
      
      const encryptedField = encryptField(testData)
      
      expect(encryptedField).toHaveProperty('encrypted')
      expect(encryptedField).toHaveProperty('timestamp')
      expect(encryptedField).toHaveProperty('version')
      expect(encryptedField.version).toBe(1)
      expect(encryptedField.timestamp).toBeInstanceOf(Date)
      expect(typeof encryptedField.encrypted).toBe('string')
    })

    it('should decrypt field with metadata', () => {
      const originalData = { sensitive: 'health data', score: 85 }
      
      const encryptedField = encryptField(originalData)
      const decryptedData = decryptField(encryptedField)
      
      expect(decryptedData).toEqual(originalData)
    })

    it('should handle complex field data', () => {
      const complexData = {
        patientAssessment: {
          mood: 7,
          anxiety: 3,
          notes: 'Patient showing improvement',
          tags: ['depression', 'therapy', 'medication'],
          history: [
            { date: '2024-01-01', score: 5 },
            { date: '2024-01-08', score: 6 },
          ],
        },
      }
      
      const encryptedField = encryptField(complexData)
      const decryptedData = decryptField(encryptedField)
      
      expect(decryptedData).toEqual(complexData)
    })

    it('should preserve field metadata across operations', () => {
      const testData = 'test field data'
      const encryptedField = encryptField(testData)
      
      // Simulate time passage
      const timestampBefore = encryptedField.timestamp.getTime()
      
      expect(encryptedField.version).toBe(1)
      expect(timestampBefore).toBeCloseTo(Date.now(), -3) // Within 1 second
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle large data encryption', () => {
      const largeData = 'x'.repeat(1000000) // 1MB of data
      
      const encrypted = encryptData(largeData)
      const decrypted = decryptData(encrypted)
      
      expect(decrypted).toBe(largeData)
    })

    it('should handle special characters in data', () => {
      const specialData = '🔒💊🏥 Special chars: áéíóú ñ 中文 العربية'
      
      const encrypted = encryptData(specialData)
      const decrypted = decryptData(encrypted)
      
      expect(decrypted).toBe(specialData)
    })

    it('should handle binary-like data', () => {
      const binaryData = Buffer.from([0, 1, 2, 255, 128, 64]).toString('binary')
      
      const encrypted = encryptData(binaryData)
      const decrypted = decryptData(encrypted)
      
      expect(decrypted).toBe(binaryData)
    })

    it('should maintain data integrity across multiple encrypt/decrypt cycles', () => {
      let data = { cycle: 0, content: 'original data' }
      
      for (let i = 1; i <= 5; i++) {
        const encrypted = encryptData(data)
        data = decryptData(encrypted)
        data.cycle = i
      }
      
      expect(data.cycle).toBe(5)
      expect(data.content).toBe('original data')
    })

    it('should handle concurrent encryption operations', async () => {
      const testData = 'concurrent test data'
      
      const promises = Array(10).fill(null).map((_, index) => 
        Promise.resolve(encryptData(`${testData}_${index}`))
      )
      
      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(10)
      results.forEach((result, index) => {
        const decrypted = decryptData(result)
        expect(decrypted).toBe(`${testData}_${index}`)
      })
    })

    it('should produce secure random values', () => {
      const values = Array(100).fill(null).map(() => generateSecureToken(16))
      const uniqueValues = new Set(values)
      
      expect(uniqueValues.size).toBe(100) // All values should be unique
    })

    it('should handle encryption key rotation scenario', () => {
      const data = 'data for key rotation test'
      const originalKey = process.env.ENCRYPTION_KEY
      
      // Encrypt with first key
      const encrypted = encryptData(data)
      
      // Change key (simulating rotation)
      process.env.ENCRYPTION_KEY = 'new-test-key-after-rotation-32'
      
      // Should fail to decrypt with wrong key
      expect(() => decryptData(encrypted)).toThrow('Failed to decrypt data')
      
      // Restore original key
      process.env.ENCRYPTION_KEY = originalKey
      
      // Should work with original key
      expect(decryptData(encrypted)).toBe(data)
    })
  })

  describe('Security Properties', () => {
    it('should ensure encrypted data is not predictable', () => {
      const data = 'predictable test data'
      const encryptions = Array(5).fill(null).map(() => encryptData(data))
      
      // All encryptions should be different
      const uniqueEncryptions = new Set(encryptions)
      expect(uniqueEncryptions.size).toBe(5)
    })

    it('should ensure hash identifiers are deterministic but secure', () => {
      const identifier = 'patient_12345'
      
      const hash1 = hashIdentifier(identifier)
      const hash2 = hashIdentifier(identifier)
      
      expect(hash1).toBe(hash2)
      expect(hash1).not.toContain(identifier)
      expect(hash1.length).toBe(64)
    })

    it('should sanitize all known sensitive fields', () => {
      const allSensitiveFields = {
        password: 'secret',
        ssn: '123-45-6789',
        dateOfBirth: '1990-01-01',
        address: '123 Main St',
        phone: '555-0123',
        email: 'test@example.com',
        emergencyContact: 'Jane Doe - 555-0456',
        medications: 'Sertraline 50mg',
        diagnosis: 'Major Depression',
        treatmentNotes: 'Patient progress notes',
        progressNotes: 'Therapy session notes',
        insuranceInfo: 'BCBS Policy 123456',
      }
      
      const sanitized = sanitizeForLogging(allSensitiveFields)
      
      Object.keys(allSensitiveFields).forEach(field => {
        expect(sanitized[field]).toBe('[REDACTED]')
      })
    })
  })
})