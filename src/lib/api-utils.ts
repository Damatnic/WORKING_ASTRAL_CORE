import { NextResponse } from 'next/server';
import crypto from 'crypto';

// API Response helpers
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function createSuccessResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message
  });
}

export function createErrorResponse(error: string, status: number = 400) {
  return NextResponse.json({
    success: false,
    error
  }, { status });
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return NextResponse.json({
    success: true,
    data: {
      items: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }
  });
}

export function createValidationErrorResponse(errors: any[]) {
  return NextResponse.json({
    success: false,
    error: 'Validation failed',
    data: { errors }
  }, { status: 400 });
}

// Token generation utilities
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Additional utility functions
export function getClientIp(request: any): string {
  return request.ip || request.headers?.['x-forwarded-for'] || request.headers?.['x-real-ip'] || 'unknown';
}

export function createAuditLog(data: any): void {
  // Audit log creation logic
  console.log('Audit log:', data);
}
