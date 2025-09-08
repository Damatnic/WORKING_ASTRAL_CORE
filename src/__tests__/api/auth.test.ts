import { createMocks } from 'node-mocks-http'
import { NextApiRequest, NextApiResponse } from 'next'
import * as bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  })),
}))

// Mock bcrypt
jest.mock('bcryptjs')

// Mock JWT
jest.mock('jsonwebtoken')

describe('/api/auth', () => {
  let prisma: any

  beforeEach(() => {
    prisma = new PrismaClient()
    jest.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    it('successfully registers a new user with valid data', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'newuser@example.com',
          password: 'SecureP@ssw0rd123',
          name: 'New User',
          acceptedTerms: true,
        },
      })

      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({
        id: 'user-id',
        email: 'newuser@example.com',
        name: 'New User',
        createdAt: new Date(),
      })
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')
      ;(jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token')

      // Import and call the handler
      const handler = require('@/app/api/auth/register/route')
      await handler.POST(req, res)

      expect(res._getStatusCode()).toBe(201)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.success).toBe(true)
      expect(jsonData.user.email).toBe('newuser@example.com')
      expect(jsonData.token).toBe('mock-jwt-token')
    })

    it('rejects registration with existing email', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'existing@example.com',
          password: 'SecureP@ssw0rd123',
          name: 'Existing User',
          acceptedTerms: true,
        },
      })

      prisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'existing@example.com',
      })

      const handler = require('@/app/api/auth/register/route')
      await handler.POST(req, res)

      expect(res._getStatusCode()).toBe(409)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.error).toBe('Email already registered')
    })

    it('validates password strength requirements', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User',
          acceptedTerms: true,
        },
      })

      const handler = require('@/app/api/auth/register/route')
      await handler.POST(req, res)

      expect(res._getStatusCode()).toBe(400)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.error).toContain('Password must')
    })

    it('requires acceptance of terms and privacy policy', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'SecureP@ssw0rd123',
          name: 'Test User',
          acceptedTerms: false,
        },
      })

      const handler = require('@/app/api/auth/register/route')
      await handler.POST(req, res)

      expect(res._getStatusCode()).toBe(400)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.error).toBe('Must accept terms and privacy policy')
    })

    it('logs registration attempt for security audit', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Test Browser',
        },
        body: {
          email: 'audit@example.com',
          password: 'SecureP@ssw0rd123',
          name: 'Audit User',
          acceptedTerms: true,
        },
      })

      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({
        id: 'user-id',
        email: 'audit@example.com',
      })
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password')

      const handler = require('@/app/api/auth/register/route')
      await handler.POST(req, res)

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'USER_REGISTRATION',
          userId: 'user-id',
          ipAddress: '192.168.1.1',
          userAgent: 'Test Browser',
        }),
      })
    })
  })

  describe('POST /api/auth/login', () => {
    it('successfully logs in with valid credentials', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'user@example.com',
          password: 'SecureP@ssw0rd123',
        },
      })

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashed-password',
        name: 'Test User',
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      ;(jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token')

      const handler = require('@/app/api/auth/login/route')
      await handler.POST(req, res)

      expect(res._getStatusCode()).toBe(200)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.success).toBe(true)
      expect(jsonData.token).toBe('mock-jwt-token')
    })

    it('rejects login with invalid password', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'user@example.com',
          password: 'WrongPassword',
        },
      })

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashed-password',
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const handler = require('@/app/api/auth/login/route')
      await handler.POST(req, res)

      expect(res._getStatusCode()).toBe(401)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.error).toBe('Invalid credentials')
    })

    it('implements rate limiting for failed login attempts', async () => {
      const email = 'ratelimit@example.com'
      
      // Simulate multiple failed attempts
      for (let i = 0; i < 6; i++) {
        const { req, res } = createMocks({
          method: 'POST',
          body: { email, password: 'WrongPassword' },
        })

        prisma.user.findUnique.mockResolvedValue({
          id: 'user-id',
          email,
          password: 'hashed-password',
        })
        ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

        const handler = require('@/app/api/auth/login/route')
        await handler.POST(req, res)

        if (i >= 5) {
          expect(res._getStatusCode()).toBe(429)
          const jsonData = JSON.parse(res._getData())
          expect(jsonData.error).toContain('Too many login attempts')
        }
      }
    })

    it('creates secure session token with proper expiry', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'user@example.com',
          password: 'SecureP@ssw0rd123',
          rememberMe: true,
        },
      })

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        password: 'hashed-password',
      })
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const handler = require('@/app/api/auth/login/route')
      await handler.POST(req, res)

      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-id' }),
        expect.any(String),
        expect.objectContaining({
          expiresIn: '30d', // Remember me enabled
        })
      )
    })
  })

  describe('POST /api/auth/logout', () => {
    it('successfully logs out authenticated user', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
      })

      ;(jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-id' })
      prisma.session.delete.mockResolvedValue({ id: 'session-id' })

      const handler = require('@/app/api/auth/logout/route')
      await handler.POST(req, res)

      expect(res._getStatusCode()).toBe(200)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.success).toBe(true)
      expect(jsonData.message).toBe('Logged out successfully')
    })

    it('clears all sessions when requested', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        headers: {
          authorization: 'Bearer mock-jwt-token',
        },
        body: {
          clearAllSessions: true,
        },
      })

      ;(jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-id' })

      const handler = require('@/app/api/auth/logout/route')
      await handler.POST(req, res)

      expect(prisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
      })
    })
  })

  describe('POST /api/auth/password-reset', () => {
    it('sends password reset email for valid user', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'user@example.com',
        },
      })

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
      })

      const handler = require('@/app/api/auth/password-reset/route')
      await handler.POST(req, res)

      expect(res._getStatusCode()).toBe(200)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.message).toBe('If the email exists, a reset link has been sent')
    })

    it('returns same response for non-existent email (security)', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'nonexistent@example.com',
        },
      })

      prisma.user.findUnique.mockResolvedValue(null)

      const handler = require('@/app/api/auth/password-reset/route')
      await handler.POST(req, res)

      expect(res._getStatusCode()).toBe(200)
      const jsonData = JSON.parse(res._getData())
      expect(jsonData.message).toBe('If the email exists, a reset link has been sent')
    })

    it('implements rate limiting for password reset requests', async () => {
      const email = 'reset@example.com'
      
      // Multiple reset requests
      for (let i = 0; i < 4; i++) {
        const { req, res } = createMocks({
          method: 'POST',
          body: { email },
        })

        if (i >= 3) {
          const handler = require('@/app/api/auth/password-reset/route')
          await handler.POST(req, res)
          
          expect(res._getStatusCode()).toBe(429)
          const jsonData = JSON.parse(res._getData())
          expect(jsonData.error).toContain('Too many reset attempts')
        }
      }
    })
  })

  describe('Security Headers', () => {
    it('sets appropriate security headers on all auth responses', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'SecureP@ssw0rd123',
        },
      })

      const handler = require('@/app/api/auth/login/route')
      await handler.POST(req, res)

      const headers = res._getHeaders()
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['x-frame-options']).toBe('DENY')
      expect(headers['x-xss-protection']).toBe('1; mode=block')
      expect(headers['strict-transport-security']).toContain('max-age=')
    })
  })
})