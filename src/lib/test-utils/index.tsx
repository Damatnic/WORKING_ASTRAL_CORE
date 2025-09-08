/**
 * Test utilities barrel export
 */

export * from './db-setup'
export * from './factories'
export * from './fixtures'

// Re-export commonly used testing utilities
export { render, screen, waitFor, fireEvent } from '@testing-library/react'
export { userEvent } from '@testing-library/user-event'
export type { RenderOptions } from '@testing-library/react'

// Test environment helpers
export const isTestEnvironment = () => process.env.NODE_ENV === 'test'
export const isCI = () => !!process.env.CI

// Common test matchers
export const expectToBeValidUUID = (value: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  expect(uuidRegex.test(value)).toBe(true)
}

export const expectToBeValidEmail = (value: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  expect(emailRegex.test(value)).toBe(true)
}

// Async test helpers
export const flushPromises = () => new Promise(setImmediate)

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Mock utilities
export const createMockFunction = <T extends (...args: any[]) => any>(
  implementation?: T
): jest.MockedFunction<T> => {
  return jest.fn(implementation) as jest.MockedFunction<T>
}

// Custom render function for React components with providers
import React, { ReactElement } from 'react'
import { render as rtlRender, RenderOptions } from '@testing-library/react'

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add custom options here if needed
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    // Add providers here (Session, Theme, etc.)
    return <>{children}</>
  }

  return rtlRender(ui, { wrapper: Wrapper, ...options })
}