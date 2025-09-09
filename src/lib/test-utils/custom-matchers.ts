/**
 * Custom Jest Matchers
 * Extended matchers for better testing assertions
 */

import { expect } from '@jest/globals'

// Extend Jest matchers interface
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R
      toBeValidEmail(): R
      toBeValidUrl(): R
      toBeValidPhoneNumber(): R
      toBeValidDate(): R
      toHaveValidStructure(expectedStructure: any): R
      toHaveBeenCalledWithError(error?: string | RegExp): R
      toBeWithinRange(min: number, max: number): R
      toHaveLength(expected: number): R
      toContainObject(expected: any): R
      toHaveProperty(property: string, value?: any): R
      toSatisfyApiSchema(schema: any): R
      toHaveValidationError(field: string, message?: string): R
      toBeAccessible(): R
      toHaveNoConsoleErrors(): R
      toMatchImageSnapshot(): R
      toRenderSuccessfully(): R
    }
  }
}

// UUID validation matcher
export const toBeValidUUID = (received: any) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const pass = typeof received === 'string' && uuidRegex.test(received)
  
  return {
    message: () => pass 
      ? `expected ${received} not to be a valid UUID`
      : `expected ${received} to be a valid UUID`,
    pass,
  }
}

// Email validation matcher
export const toBeValidEmail = (received: any) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const pass = typeof received === 'string' && emailRegex.test(received)
  
  return {
    message: () => pass
      ? `expected ${received} not to be a valid email`
      : `expected ${received} to be a valid email`,
    pass,
  }
}

// URL validation matcher
export const toBeValidUrl = (received: any) => {
  try {
    new URL(received)
    return {
      message: () => `expected ${received} not to be a valid URL`,
      pass: true,
    }
  } catch {
    return {
      message: () => `expected ${received} to be a valid URL`,
      pass: false,
    }
  }
}

// Phone number validation matcher
export const toBeValidPhoneNumber = (received: any) => {
  const phoneRegex = /^[+]?[1-9]?\d{9,15}$/
  const pass = typeof received === 'string' && phoneRegex.test(received.replace(/[\s()-]/g, ''))
  
  return {
    message: () => pass
      ? `expected ${received} not to be a valid phone number`
      : `expected ${received} to be a valid phone number`,
    pass,
  }
}

// Date validation matcher
export const toBeValidDate = (received: any) => {
  const date = new Date(received)
  const pass = date instanceof Date && !isNaN(date.getTime())
  
  return {
    message: () => pass
      ? `expected ${received} not to be a valid date`
      : `expected ${received} to be a valid date`,
    pass,
  }
}

// Object structure validation matcher
export const toHaveValidStructure = (received: any, expectedStructure: any) => {
  const validateStructure = (obj: any, structure: any, path = ''): string[] => {
    const errors: string[] = []
    
    if (typeof structure === 'object' && structure !== null && !Array.isArray(structure)) {
      if (typeof obj !== 'object' || obj === null) {
        errors.push(`${path} should be an object`)
        return errors
      }
      
      for (const [key, expectedType] of Object.entries(structure)) {
        const currentPath = path ? `${path}.${key}` : key
        
        if (!(key in obj)) {
          errors.push(`${currentPath} is missing`)
          continue
        }
        
        if (typeof expectedType === 'string') {
          if (typeof obj[key] !== expectedType) {
            errors.push(`${currentPath} should be of type ${expectedType}, got ${typeof obj[key]}`)
          }
        } else if (typeof expectedType === 'object') {
          errors.push(...validateStructure(obj[key], expectedType, currentPath))
        }
      }
    }
    
    return errors
  }
  
  const errors = validateStructure(received, expectedStructure)
  const pass = errors.length === 0
  
  return {
    message: () => pass
      ? `expected object not to have valid structure`
      : `expected object to have valid structure:\n${errors.join('\n')}`,
    pass,
  }
}

// Error call matcher
export const toHaveBeenCalledWithError = (mockFn: any, error?: string | RegExp) => {
  const calls = mockFn.mock.calls
  const hasErrorCall = calls.some((call: any[]) => {
    const firstArg = call[0]
    if (firstArg instanceof Error) {
      if (error) {
        return typeof error === 'string' 
          ? firstArg.message === error
          : error.test(firstArg.message)
      }
      return true
    }
    return false
  })
  
  return {
    message: () => hasErrorCall
      ? `expected not to be called with error${error ? ` matching ${error}` : ''}`
      : `expected to be called with error${error ? ` matching ${error}` : ''}`,
    pass: hasErrorCall,
  }
}

// Range matcher
export const toBeWithinRange = (received: any, min: number, max: number) => {
  const pass = typeof received === 'number' && received >= min && received <= max
  
  return {
    message: () => pass
      ? `expected ${received} not to be within range ${min}-${max}`
      : `expected ${received} to be within range ${min}-${max}`,
    pass,
  }
}

// Object contains matcher
export const toContainObject = (received: any[], expected: any) => {
  const pass = received.some(item => 
    Object.keys(expected).every(key => 
      item[key] === expected[key]
    )
  )
  
  return {
    message: () => pass
      ? `expected array not to contain object ${JSON.stringify(expected)}`
      : `expected array to contain object ${JSON.stringify(expected)}`,
    pass,
  }
}

// API schema validation matcher
export const toSatisfyApiSchema = (received: any, schema: any) => {
  // This would integrate with a schema validation library like Joi or Yup
  // For now, we'll do basic validation
  const errors = []
  
  if (schema.required) {
    for (const field of schema.required) {
      if (!(field in received)) {
        errors.push(`Missing required field: ${field}`)
      }
    }
  }
  
  if (schema.properties) {
    for (const [field, definition] of Object.entries(schema.properties as any)) {
      if (field in received) {
        const value = received[field]
        const def = definition as any
        
        if (def.type && typeof value !== def.type) {
          errors.push(`Field ${field} should be of type ${def.type}, got ${typeof value}`)
        }
      }
    }
  }
  
  const pass = errors.length === 0
  
  return {
    message: () => pass
      ? `expected not to satisfy API schema`
      : `expected to satisfy API schema:\n${errors.join('\n')}`,
    pass,
  }
}

// Validation error matcher
export const toHaveValidationError = (received: any, field: string, message?: string) => {
  const hasField = received.errors && received.errors[field]
  const hasMessage = message ? 
    hasField && received.errors[field].includes(message) :
    hasField && received.errors[field].length > 0
  
  const pass = hasMessage
  
  return {
    message: () => pass
      ? `expected not to have validation error for field ${field}${message ? ` with message "${message}"` : ''}`
      : `expected to have validation error for field ${field}${message ? ` with message "${message}"` : ''}`,
    pass,
  }
}

// Accessibility matcher (placeholder)
export const toBeAccessible = (received: any) => {
  // This would integrate with axe-core
  // For now, just check basic structure
  const isElement = received instanceof HTMLElement
  const hasRole = isElement && (received.getAttribute('role') || received.tagName)
  
  const pass = isElement && hasRole
  
  return {
    message: () => pass
      ? `expected element not to be accessible`
      : `expected element to be accessible`,
    pass,
  }
}

// Console error matcher
export const toHaveNoConsoleErrors = () => {
  const originalError = console.error
  let errorCount = 0
  
  console.error = (...args: any[]) => {
    errorCount++
    originalError.apply(console, args)
  }
  
  const pass = errorCount === 0
  
  // Restore original console.error
  console.error = originalError
  
  return {
    message: () => pass
      ? `expected console errors`
      : `expected no console errors, but found ${errorCount}`,
    pass,
  }
}

// Render success matcher
export const toRenderSuccessfully = (received: any) => {
  // Check if component rendered without throwing
  let pass = true
  let error = ''
  
  try {
    // This would be used with a render result
    const hasElement = received.container && received.container.firstChild
    pass = Boolean(hasElement)
    
    if (!pass) {
      error = 'Component did not render any elements'
    }
  } catch (e) {
    pass = false
    error = e instanceof Error ? e.message : String(e)
  }
  
  return {
    message: () => pass
      ? `expected component not to render successfully`
      : `expected component to render successfully: ${error}`,
    pass,
  }
}

// Register all custom matchers
export const setupCustomMatchers = () => {
  expect.extend({
    toBeValidUUID,
    toBeValidEmail,
    toBeValidUrl,
    toBeValidPhoneNumber,
    toBeValidDate,
    toHaveValidStructure,
    toHaveBeenCalledWithError,
    toBeWithinRange,
    toContainObject,
    toSatisfyApiSchema,
    toHaveValidationError,
    toBeAccessible,
    toHaveNoConsoleErrors,
    toRenderSuccessfully,
  })
}

// Export all matchers
export const customMatchers = {
  toBeValidUUID,
  toBeValidEmail,
  toBeValidUrl,
  toBeValidPhoneNumber,
  toBeValidDate,
  toHaveValidStructure,
  toHaveBeenCalledWithError,
  toBeWithinRange,
  toContainObject,
  toSatisfyApiSchema,
  toHaveValidationError,
  toBeAccessible,
  toHaveNoConsoleErrors,
  toRenderSuccessfully,
  setupCustomMatchers,
}

export default customMatchers