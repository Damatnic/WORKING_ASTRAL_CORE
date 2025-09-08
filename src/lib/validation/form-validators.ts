/**
 * Form Validation Utilities for AstralCore Mental Health Platform
 * 
 * This module provides:
 * - React hooks for form validation
 * - Client-side validation helpers
 * - Real-time validation feedback
 * - Error message formatting
 * - Field-level validation
 * - HIPAA-compliant form handling
 * 
 * @author AstralCore Development Team
 * @version 1.0.0
 */

import { useState, useCallback, useEffect } from 'react';
import { z, ZodSchema, ZodError } from 'zod';
import ValidationService from './validation-service';
import type { ValidationError } from '@/types';

// Form validation configuration
interface FormValidationConfig {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;
  debounceMs?: number;
  sanitizeInputs?: boolean;
  showSecurityWarnings?: boolean;
  maxRetries?: number;
}

// Field validation result
interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
  sanitizedValue?: any;
  securityLevel?: 'clean' | 'suspicious' | 'malicious';
}

// Form validation state
interface FormValidationState<T> {
  values: Partial<T>;
  errors: Record<string, string>;
  warnings: Record<string, string[]>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
  touchedFields: Set<string>;
  validatedFields: Set<string>;
  securityIssues: Record<string, string[]>;
}

// Custom validation rule
interface CustomValidationRule<T> {
  field: keyof T;
  validator: (value: any, allValues: Partial<T>) => Promise<FieldValidationResult> | FieldValidationResult;
  message?: string;
}

/**
 * Enhanced Form Validation Hook
 */
export function useFormValidation<T extends Record<string, any>>(
  schema: ZodSchema<T>,
  config: FormValidationConfig = {},
  customRules: CustomValidationRule<T>[] = []
) {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
    debounceMs = 300,
    sanitizeInputs = true,
    showSecurityWarnings = true,
    maxRetries = 3
  } = config;

  // Use ValidationService static methods directly
  
  // Form state
  const [state, setState] = useState<FormValidationState<T>>({
    values: {} as Partial<T>,
    errors: {},
    warnings: {},
    isValid: false,
    isSubmitting: false,
    isDirty: false,
    touchedFields: new Set(),
    validatedFields: new Set(),
    securityIssues: {}
  });

  // Debounced validation
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  /**
   * Validate a single field
   */
  const validateField = useCallback(async (
    fieldName: string,
    value: any,
    allValues?: Partial<T>
  ): Promise<FieldValidationResult> => {
    try {
      const validationResult: FieldValidationResult = {
        isValid: true,
        sanitizedValue: value
      };

      // Sanitize input if configured
      if (sanitizeInputs && typeof value === 'string') {
        const validationService = ValidationService.getInstance();
        const securityResult = validationService.validateSecurity(value, 'text');
        
        validationResult.sanitizedValue = securityResult.sanitized;
        validationResult.securityLevel = securityResult.level;

        if (!securityResult.isSecure) {
          validationResult.warnings = securityResult.threats;
          if (securityResult.level === 'malicious') {
            validationResult.isValid = false;
            validationResult.error = 'Input contains potentially dangerous content';
          }
        }
      }

      // Schema validation for the field
      try {
        const fieldSchema = getFieldSchema(schema, fieldName);
        if (fieldSchema) {
          fieldSchema.parse(validationResult.sanitizedValue);
        }
      } catch (error) {
        if (error instanceof ZodError) {
          validationResult.isValid = false;
          validationResult.error = error.issues[0]?.message || 'Invalid input';
        }
      }

      // Custom validation rules
      const customRule = customRules.find(rule => String(rule.field) === fieldName);
      if (customRule) {
        const customResult = await Promise.resolve(
          customRule.validator(validationResult.sanitizedValue, allValues || state.values)
        );
        
        if (!customResult.isValid) {
          validationResult.isValid = false;
          validationResult.error = customResult.error || customRule.message || 'Custom validation failed';
        }
        
        if (customResult.warnings) {
          validationResult.warnings = [
            ...(validationResult.warnings || []),
            ...customResult.warnings
          ];
        }
      }

      return validationResult;
    } catch (error) {
      return {
        isValid: false,
        error: 'Validation error occurred',
        sanitizedValue: value
      };
    }
  }, [schema, customRules, sanitizeInputs, state.values]);

  /**
   * Validate entire form
   */
  const validateForm = useCallback(async (values?: Partial<T>): Promise<{
    isValid: boolean;
    errors: Record<string, string>;
    warnings: Record<string, string[]>;
    sanitizedValues: Partial<T>;
    securityIssues: Record<string, string[]>;
  }> => {
    const valuesToValidate = values || state.values;
    const errors: Record<string, string> = {};
    const warnings: Record<string, string[]> = {};
    const securityIssues: Record<string, string[]> = {};
    const sanitizedValues: Partial<T> = {};

    // Validate each field
    for (const [fieldName, value] of Object.entries(valuesToValidate)) {
      const result = await validateField(fieldName, value, valuesToValidate);
      
      if (!result.isValid && result.error) {
        errors[fieldName] = result.error;
      }
      
      if (result.warnings && result.warnings.length > 0) {
        warnings[fieldName] = result.warnings;
        
        if (result.securityLevel && ['suspicious', 'malicious'].includes(result.securityLevel)) {
          securityIssues[fieldName] = result.warnings;
        }
      }
      
      sanitizedValues[fieldName as keyof T] = result.sanitizedValue;
    }

    // Full schema validation
    try {
      schema.parse(sanitizedValues);
    } catch (error) {
      if (error instanceof ZodError) {
        for (const err of error.issues) {
          const fieldName = err.path.join('.');
          if (!errors[fieldName]) {
            errors[fieldName] = err.message;
          }
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
      sanitizedValues,
      securityIssues
    };
  }, [schema, state.values, validateField]);

  /**
   * Handle field value change
   */
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, [fieldName]: value },
      isDirty: true,
      touchedFields: new Set([...prev.touchedFields, fieldName])
    }));

    // Debounced validation on change
    if (validateOnChange) {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }

      const timeout = setTimeout(async () => {
        const result = await validateField(fieldName, value);
        setState(prev => ({
          ...prev,
          errors: {
            ...prev.errors,
            [fieldName]: result.error || ''
          },
          warnings: {
            ...prev.warnings,
            [fieldName]: result.warnings || []
          },
          securityIssues: result.securityLevel && ['suspicious', 'malicious'].includes(result.securityLevel) ? {
            ...prev.securityIssues,
            [fieldName]: result.warnings || []
          } : prev.securityIssues,
          validatedFields: new Set([...prev.validatedFields, fieldName])
        }));
      }, debounceMs);

      setDebounceTimeout(timeout);
    }
  }, [validateOnChange, validateField, debounceMs, debounceTimeout]);

  /**
   * Handle field blur
   */
  const handleFieldBlur = useCallback(async (fieldName: string) => {
    setState(prev => ({
      ...prev,
      touchedFields: new Set([...prev.touchedFields, fieldName])
    }));

    if (validateOnBlur) {
      const value = state.values[fieldName as keyof T];
      const result = await validateField(fieldName, value);
      
      setState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [fieldName]: result.error || ''
        },
        warnings: {
          ...prev.warnings,
          [fieldName]: result.warnings || []
        },
        validatedFields: new Set([...prev.validatedFields, fieldName])
      }));
    }
  }, [validateOnBlur, validateField, state.values]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async (onSubmit: (values: T, sanitizedValues: T) => Promise<void> | void) => {
    if (!validateOnSubmit) {
      const sanitizedValues = sanitizeInputs ? 
        await sanitizeFormValues(state.values) : state.values;
      return onSubmit(state.values as T, sanitizedValues as T);
    }

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      const validationResult = await validateForm();
      
      setState(prev => ({
        ...prev,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        securityIssues: validationResult.securityIssues,
        isValid: validationResult.isValid
      }));

      if (validationResult.isValid) {
        await onSubmit(
          validationResult.sanitizedValues as T,
          validationResult.sanitizedValues as T
        );
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, _form: 'Submission failed. Please try again.' }
      }));
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [validateOnSubmit, validateForm, state.values, sanitizeInputs]);

  /**
   * Reset form
   */
  const resetForm = useCallback((newValues?: Partial<T>) => {
    setState({
      values: newValues || {},
      errors: {},
      warnings: {},
      isValid: false,
      isSubmitting: false,
      isDirty: false,
      touchedFields: new Set(),
      validatedFields: new Set(),
      securityIssues: {}
    });
  }, []);

  /**
   * Set field value programmatically
   */
  const setFieldValue = useCallback((fieldName: string, value: any) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, [fieldName]: value },
      isDirty: true
    }));
  }, []);

  /**
   * Set form values programmatically
   */
  const setValues = useCallback((values: Partial<T>) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, ...values },
      isDirty: true
    }));
  }, []);

  /**
   * Clean up debounce timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [debounceTimeout]);

  return {
    // State
    values: state.values,
    errors: state.errors,
    warnings: state.warnings,
    isValid: state.isValid,
    isSubmitting: state.isSubmitting,
    isDirty: state.isDirty,
    touchedFields: state.touchedFields,
    securityIssues: showSecurityWarnings ? state.securityIssues : {},
    
    // Actions
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setValues,
    validateField,
    validateForm
  };
}

/**
 * Simplified validation hook for single fields
 */
export function useFieldValidation<T>(
  fieldName: string,
  schema: ZodSchema<T>,
  config: FormValidationConfig = {}
) {
  const [value, setValue] = useState<T | undefined>();
  const [error, setError] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  // Use ValidationService static methods directly
  const { debounceMs = 300, sanitizeInputs = true } = config;

  const validateValue = useCallback(async (inputValue: T) => {
    setIsValidating(true);
    
    try {
      let processedValue = inputValue;

      // Sanitize if configured
      if (sanitizeInputs && typeof inputValue === 'string') {
        const validationService = ValidationService.getInstance();
        const securityResult = validationService.validateSecurity(inputValue, 'text');
        processedValue = securityResult.sanitized as T;
        
        if (!securityResult.isSecure) {
          setWarnings(securityResult.threats);
          if (securityResult.level === 'malicious') {
            setError('Input contains potentially dangerous content');
            setIsValidating(false);
            return;
          }
        }
      }

      // Schema validation
      schema.parse(processedValue);
      setError('');
      setWarnings([]);
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        setError(validationError.issues[0]?.message || 'Invalid input');
      } else {
        setError('Validation failed');
      }
    } finally {
      setIsValidating(false);
    }
  }, [schema, sanitizeInputs]);

  // Debounced validation
  useEffect(() => {
    if (value === undefined) return;

    const timeout = setTimeout(() => {
      validateValue(value);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [value, validateValue, debounceMs]);

  return {
    value,
    setValue,
    error,
    warnings,
    isValidating,
    isValid: !error && !isValidating,
    validateValue
  };
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Extract field schema from main schema (simplified approach)
 */
function getFieldSchema(mainSchema: ZodSchema, fieldName: string): ZodSchema | null {
  try {
    // This is a simplified implementation - in practice, you might need more sophisticated schema extraction
    if ('shape' in mainSchema && typeof mainSchema.shape === 'object') {
      return (mainSchema.shape as any)[fieldName] || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sanitize form values
 */
async function sanitizeFormValues(values: Record<string, any>): Promise<Record<string, any>> {
  const validationService = ValidationService.getInstance();
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(values)) {
    if (typeof value === 'string') {
      const result = validationService.validateSecurity(value, 'text');
      sanitized[key] = result.sanitized;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Format validation error for display
 */
export function formatValidationError(error: ValidationError): string {
  const fieldName = error.field.split('.').pop() || error.field;
  const formattedField = fieldName.replace(/([A-Z])/g, ' $1').toLowerCase();
  return `${formattedField}: ${error.message}`;
}

/**
 * Get security level color for UI
 */
export function getSecurityLevelColor(level: 'clean' | 'suspicious' | 'malicious'): string {
  switch (level) {
    case 'clean': return 'green';
    case 'suspicious': return 'yellow';
    case 'malicious': return 'red';
    default: return 'gray';
  }
}

/**
 * Create a validation rule for passwords
 */
export function createPasswordValidationRule<T>(): CustomValidationRule<T> {
  return {
    field: 'password' as keyof T,
    validator: (password: string) => {
      if (!password) {
        return { isValid: false, error: 'Password is required' };
      }

      const checks = [
        { test: password.length >= 12, message: 'Password must be at least 12 characters' },
        { test: /[a-z]/.test(password), message: 'Password must contain lowercase letters' },
        { test: /[A-Z]/.test(password), message: 'Password must contain uppercase letters' },
        { test: /\d/.test(password), message: 'Password must contain numbers' },
        { test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), message: 'Password must contain special characters' }
      ];

      for (const check of checks) {
        if (!check.test) {
          return { isValid: false, error: check.message };
        }
      }

      // Check for common passwords
      const commonPasswords = ['password123', 'Password123!', '123456789', 'qwerty123'];
      if (commonPasswords.some(common => password.toLowerCase().includes(common.toLowerCase()))) {
        return { isValid: false, error: 'Password is too common' };
      }

      return { isValid: true };
    }
  };
}

/**
 * Create a validation rule for email uniqueness
 */
export function createEmailUniquenessRule<T>(
  checkEmailExists: (email: string) => Promise<boolean>
): CustomValidationRule<T> {
  return {
    field: 'email' as keyof T,
    validator: async (email: string) => {
      if (!email) return { isValid: true }; // Let schema handle required validation
      
      try {
        const exists = await checkEmailExists(email);
        if (exists) {
          return { isValid: false, error: 'Email address is already registered' };
        }
        return { isValid: true };
      } catch {
        return { 
          isValid: true, // Don't fail validation due to network errors
          warnings: ['Could not verify email uniqueness'] 
        };
      }
    }
  };
}

/**
 * Create validation rule for medical text content
 */
export function createMedicalTextRule<T>(fieldName: keyof T): CustomValidationRule<T> {
  return {
    field: fieldName,
    validator: (text: string) => {
      if (!text) return { isValid: true };

      const validationService = ValidationService.getInstance();
      const medicalCheck = validationService.validateMedicalText(text);
      
      if (!medicalCheck.isValid) {
        return { 
          isValid: false, 
          error: medicalCheck.message || 'Text contains invalid characters for medical documentation' 
        };
      }

      return { isValid: true };
    }
  };
}

// Export types for external use
export type {
  FormValidationConfig,
  FieldValidationResult,
  FormValidationState,
  CustomValidationRule
};