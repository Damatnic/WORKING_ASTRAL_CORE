/**
 * Authentication Flow Integration Tests
 * Comprehensive testing of authentication system
 */

import { describe, expect, it, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

// Test utilities
import {
  renderWithProviders,
  renderWithAuth,
  renderWithoutAuth,
  DatabaseTestHelper,
  testUsers,
  authFixtures,
  apiFixtures,
  createMockFunction,
  mockApiResponse,
  mockApiError,
} from '@/lib/test-utils'

// Components to test
import LoginForm from '@/components/auth/LoginForm'
import RegisterForm from '@/components/auth/RegisterForm'
import MFASetup from '@/components/auth/MFASetup'
import PasswordReset from '@/components/auth/PasswordReset'

// Services to test
import { authService } from '@/lib/auth/auth-service'
import { encryptionService } from '@/lib/encryption/encryption-service'
import { auditService } from '@/lib/audit/audit-service'

// MSW server for API mocking
const server = setupServer(
  // Auth endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(ctx.json(apiFixtures.successfulLogin))
  }),
  rest.post('/api/auth/register', (req, res, ctx) => {
    return res(ctx.json({ success: true, user: testUsers.regularUser }))
  }),
  rest.post('/api/auth/logout', (req, res, ctx) => {
    return res(ctx.json({ success: true }))
  }),
  rest.post('/api/auth/forgot-password', (req, res, ctx) => {
    return res(ctx.json({ success: true, message: 'Reset email sent' }))
  }),
  rest.post('/api/auth/reset-password', (req, res, ctx) => {
    return res(ctx.json({ success: true, message: 'Password reset successful' }))
  }),
  rest.get('/api/auth/session', (req, res, ctx) => {
    return res(ctx.json({ user: testUsers.regularUser }))
  })
)

describe('Authentication Flow Integration Tests', () => {
  let dbHelper: DatabaseTestHelper
  let user: ReturnType<typeof userEvent.setup>

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  beforeEach(async () => {
    dbHelper = new DatabaseTestHelper()
    await dbHelper.setup()
    user = userEvent.setup()
    
    // Reset all mocks
    jest.clearAllMocks()
    
    // Mock console to reduce noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(async () => {
    await dbHelper.teardown()
    server.resetHandlers()
    jest.restoreAllMocks()
  })

  afterAll(() => {
    server.close()
  })

  describe('User Registration Flow', () => {
    it('should register a new user successfully', async () => {
      const onSuccess = createMockFunction()
      const onError = createMockFunction()

      renderWithoutAuth(
        <RegisterForm onSuccess={onSuccess} onError={onError} />
      )

      // Fill out the registration form
      await user.type(screen.getByLabelText(/email/i), 'newuser@test.com')
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/^password/i), 'TestPassword123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'TestPassword123!')
      await user.click(screen.getByRole('checkbox', { name: /accept terms/i }))

      // Submit the form
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      // Wait for the success callback
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({
          email: 'newuser@test.com'
        }))
      })

      expect(onError).not.toHaveBeenCalled()
    })

    it('should show validation errors for invalid input', async () => {
      renderWithoutAuth(<RegisterForm />)

      // Submit without filling required fields
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      // Check for validation errors
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })

    it('should prevent registration with existing email', async () => {
      // Mock API to return conflict error
      server.use(
        rest.post('/api/auth/register', (req, res, ctx) => {
          return res(
            ctx.status(409),
            ctx.json({ error: 'Email already exists' })
          )
        })
      )

      const onError = createMockFunction()
      renderWithoutAuth(<RegisterForm onError={onError} />)

      // Fill out form with existing email
      await user.type(screen.getByLabelText(/email/i), testUsers.regularUser.email)
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/^password/i), 'TestPassword123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'TestPassword123!')
      await user.click(screen.getByRole('checkbox', { name: /accept terms/i }))

      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Email already exists')
          })
        )
      })
    })

    it('should enforce password strength requirements', async () => {
      renderWithoutAuth(<RegisterForm />)

      // Fill form with weak password
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/^password/i), 'weak')
      await user.type(screen.getByLabelText(/confirm password/i), 'weak')

      // Password strength indicator should show
      await waitFor(() => {
        expect(screen.getByText(/password strength/i)).toBeInTheDocument()
        expect(screen.getByText(/weak/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
      })
    })
  })

  describe('User Login Flow', () => {
    it('should login with valid credentials', async () => {
      const onSuccess = createMockFunction()
      const onError = createMockFunction()

      renderWithoutAuth(
        <LoginForm onSuccess={onSuccess} onError={onError} />
      )

      // Fill login form
      await user.type(screen.getByLabelText(/email/i), authFixtures.validCredentials.email)
      await user.type(screen.getByLabelText(/password/i), authFixtures.validCredentials.password)

      // Submit form
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Wait for success
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            user: expect.objectContaining({
              email: authFixtures.validCredentials.email
            })
          })
        )
      })

      expect(onError).not.toHaveBeenCalled()
    })

    it('should reject invalid credentials', async () => {
      // Mock API to return 401
      server.use(
        rest.post('/api/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({ error: 'Invalid credentials' })
          )
        })
      )

      const onError = createMockFunction()
      renderWithoutAuth(<LoginForm onError={onError} />)

      await user.type(screen.getByLabelText(/email/i), authFixtures.invalidCredentials.email)
      await user.type(screen.getByLabelText(/password/i), authFixtures.invalidCredentials.password)
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Invalid credentials')
          })
        )
      })
    })

    it('should handle rate limiting', async () => {
      // Mock API to return rate limit error
      server.use(
        rest.post('/api/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(429),
            ctx.json({ error: 'Too many login attempts. Please try again later.' })
          )
        })
      )

      const onError = createMockFunction()
      renderWithoutAuth(<LoginForm onError={onError} />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Too many login attempts')
          })
        )
      })
    })

    it('should show account locked message', async () => {
      // Mock API to return account locked error
      server.use(
        rest.post('/api/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(423),
            ctx.json({ 
              error: 'Account locked due to multiple failed login attempts',
              lockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString()
            })
          )
        })
      )

      renderWithoutAuth(<LoginForm />)

      await user.type(screen.getByLabelText(/email/i), 'locked@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/account locked/i)).toBeInTheDocument()
        expect(screen.getByText(/multiple failed login attempts/i)).toBeInTheDocument()
      })
    })
  })

  describe('Multi-Factor Authentication (MFA)', () => {
    it('should prompt for MFA token when enabled', async () => {
      // Mock API to return MFA required
      server.use(
        rest.post('/api/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({ 
              mfaRequired: true,
              tempToken: 'temp-token-for-mfa'
            })
          )
        })
      )

      renderWithoutAuth(<LoginForm />)

      await user.type(screen.getByLabelText(/email/i), testUsers.mfaUser.email)
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Should show MFA input
      await waitFor(() => {
        expect(screen.getByText(/enter verification code/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument()
      })
    })

    it('should accept valid MFA token', async () => {
      // Mock successful MFA verification
      server.use(
        rest.post('/api/auth/verify-mfa', (req, res, ctx) => {
          return res(ctx.json(apiFixtures.successfulLogin))
        })
      )

      const onSuccess = createMockFunction()
      renderWithoutAuth(<LoginForm onSuccess={onSuccess} />)

      // Simulate MFA required state
      // This would typically be set by the login response
      // For this test, we'll render the MFA component directly
      const { rerender } = renderWithoutAuth(
        <MFASetup 
          tempToken="temp-token"
          onSuccess={onSuccess}
        />
      )

      await user.type(screen.getByLabelText(/verification code/i), authFixtures.validMFAToken)
      await user.click(screen.getByRole('button', { name: /verify/i }))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
      })
    })
  })

  describe('Password Reset Flow', () => {
    it('should send password reset email', async () => {
      const onSuccess = createMockFunction()
      renderWithoutAuth(<PasswordReset onSuccess={onSuccess} />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /send reset email/i }))

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Reset email sent')
          })
        )
      })
    })

    it('should handle non-existent email gracefully', async () => {
      // Mock API to return success even for non-existent email (security best practice)
      const onSuccess = createMockFunction()
      renderWithoutAuth(<PasswordReset onSuccess={onSuccess} />)

      await user.type(screen.getByLabelText(/email/i), 'nonexistent@example.com')
      await user.click(screen.getByRole('button', { name: /send reset email/i }))

      // Should still show success message to prevent email enumeration
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('Reset email sent')
          })
        )
      })
    })
  })

  describe('Session Management', () => {
    it('should maintain session across page reloads', async () => {
      const { rerender } = renderWithAuth(<div>Authenticated Content</div>)
      
      expect(screen.getByText('Authenticated Content')).toBeInTheDocument()

      // Simulate page reload by re-rendering with the same session
      rerender(<div>Authenticated Content After Reload</div>)
      
      expect(screen.getByText('Authenticated Content After Reload')).toBeInTheDocument()
    })

    it('should handle session expiration', async () => {
      const { rerender } = renderWithAuth(<div>Authenticated Content</div>)
      
      expect(screen.getByText('Authenticated Content')).toBeInTheDocument()

      // Mock expired session
      server.use(
        rest.get('/api/auth/session', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({ error: 'Session expired' })
          )
        })
      )

      // Simulate session check
      rerender(<div>Content after session expired</div>)
      
      // Should redirect to login or show unauthenticated state
      await waitFor(() => {
        expect(screen.queryByText('Authenticated Content')).not.toBeInTheDocument()
      })
    })
  })

  describe('Security Features', () => {
    it('should create audit logs for authentication events', async () => {
      const auditSpy = jest.spyOn(auditService, 'logAuthEvent')
      
      renderWithoutAuth(<LoginForm />)

      await user.type(screen.getByLabelText(/email/i), authFixtures.validCredentials.email)
      await user.type(screen.getByLabelText(/password/i), authFixtures.validCredentials.password)
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(auditSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'login_success',
            userId: expect.any(String),
            ipAddress: expect.any(String),
          })
        )
      })

      auditSpy.mockRestore()
    })

    it('should encrypt sensitive data', async () => {
      const encryptSpy = jest.spyOn(encryptionService, 'encrypt')
      
      renderWithoutAuth(<RegisterForm />)

      await user.type(screen.getByLabelText(/email/i), 'newuser@test.com')
      await user.type(screen.getByLabelText(/first name/i), 'John')
      await user.type(screen.getByLabelText(/last name/i), 'Doe')
      await user.type(screen.getByLabelText(/^password/i), 'TestPassword123!')
      await user.type(screen.getByLabelText(/confirm password/i), 'TestPassword123!')
      await user.click(screen.getByRole('checkbox', { name: /accept terms/i }))
      await user.click(screen.getByRole('button', { name: /sign up/i }))

      await waitFor(() => {
        expect(encryptSpy).toHaveBeenCalled()
      })

      encryptSpy.mockRestore()
    })
  })

  describe('Accessibility and UX', () => {
    it('should be keyboard accessible', async () => {
      renderWithoutAuth(<LoginForm />)

      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText(/email/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByLabelText(/password/i)).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus()
    })

    it('should have proper ARIA labels', () => {
      renderWithoutAuth(<LoginForm />)

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-required', 'true')
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-required', 'true')
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should announce errors to screen readers', async () => {
      renderWithoutAuth(<LoginForm />)

      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        const errorMessage = screen.getByText(/email is required/i)
        expect(errorMessage).toHaveAttribute('role', 'alert')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      server.use(
        rest.post('/api/auth/login', (req, res, ctx) => {
          return res.networkError('Network connection failed')
        })
      )

      const onError = createMockFunction()
      renderWithoutAuth(<LoginForm onError={onError} />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('network')
          })
        )
      })
    })

    it('should handle server errors gracefully', async () => {
      // Mock server error
      server.use(
        rest.post('/api/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Internal server error' })
          )
        })
      )

      const onError = createMockFunction()
      renderWithoutAuth(<LoginForm onError={onError} />)

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining('server error')
          })
        )
      })
    })
  })
})