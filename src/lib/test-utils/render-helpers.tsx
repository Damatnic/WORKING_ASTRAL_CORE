/**
 * Render Helpers
 * Custom render functions for testing React components
 */

import React from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'react-hot-toast'
import { sessionFixtures } from './fixtures'
import type { Session } from 'next-auth'

// Custom render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null
  queryClient?: QueryClient
  theme?: 'light' | 'dark' | 'system'
  initialEntries?: string[]
  preloadedState?: any
}

// Create a new QueryClient for each test to ensure isolation
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
  logger: {
    log: () => {},
    warn: () => {},
    error: () => {},
  },
})

// All Providers Wrapper
const AllProvidersWrapper: React.FC<{
  children: React.ReactNode
  session?: Session | null
  queryClient?: QueryClient
  theme?: 'light' | 'dark' | 'system'
}> = ({ 
  children, 
  session = null, 
  queryClient, 
  theme = 'light' 
}) => {
  const testQueryClient = queryClient || createTestQueryClient()
  
  return (
    <QueryClientProvider client={testQueryClient}>
      <SessionProvider session={session}>
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          enableSystem={theme === 'system'}
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}

// Custom render function
export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } => {
  const {
    session,
    queryClient,
    theme = 'light',
    ...renderOptions
  } = options

  const testQueryClient = queryClient || createTestQueryClient()

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <AllProvidersWrapper
      session={session}
      queryClient={testQueryClient}
      theme={theme}
    >
      {children}
    </AllProvidersWrapper>
  )

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions })

  return {
    ...renderResult,
    queryClient: testQueryClient,
  }
}

// Render with authenticated session
export const renderWithAuth = (
  ui: React.ReactElement,
  options: Omit<CustomRenderOptions, 'session'> & {
    userType?: 'regular' | 'admin' | 'therapist' | 'crisis_counselor' | 'super_admin'
  } = {}
) => {
  const { userType = 'regular', ...restOptions } = options
  
  const sessionMap = {
    regular: sessionFixtures.authenticatedSession,
    admin: sessionFixtures.adminSession,
    therapist: sessionFixtures.therapistSession,
    crisis_counselor: sessionFixtures.authenticatedSession, // Add specific if needed
    super_admin: sessionFixtures.adminSession, // Add specific if needed
  }

  return renderWithProviders(ui, {
    ...restOptions,
    session: sessionMap[userType],
  })
}

// Render without authentication
export const renderWithoutAuth = (
  ui: React.ReactElement,
  options: Omit<CustomRenderOptions, 'session'> = {}
) => {
  return renderWithProviders(ui, {
    ...options,
    session: null,
  })
}

// Render with expired session
export const renderWithExpiredAuth = (
  ui: React.ReactElement,
  options: Omit<CustomRenderOptions, 'session'> = {}
) => {
  return renderWithProviders(ui, {
    ...options,
    session: sessionFixtures.expiredSession,
  })
}

// Render with dark theme
export const renderWithDarkTheme = (
  ui: React.ReactElement,
  options: Omit<CustomRenderOptions, 'theme'> = {}
) => {
  return renderWithProviders(ui, {
    ...options,
    theme: 'dark',
  })
}

// Render for mobile viewport
export const renderForMobile = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  // Set mobile viewport before rendering
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  })
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667,
  })
  
  // Dispatch resize event
  window.dispatchEvent(new Event('resize'))
  
  return renderWithProviders(ui, options)
}

// Render for tablet viewport
export const renderForTablet = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 768,
  })
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 1024,
  })
  
  window.dispatchEvent(new Event('resize'))
  
  return renderWithProviders(ui, options)
}

// Render for desktop viewport
export const renderForDesktop = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1280,
  })
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 720,
  })
  
  window.dispatchEvent(new Event('resize'))
  
  return renderWithProviders(ui, options)
}

// Create wrapper for component testing
export const createWrapper = (options: CustomRenderOptions = {}) => {
  const {
    session,
    queryClient,
    theme = 'light',
  } = options

  const testQueryClient = queryClient || createTestQueryClient()

  return ({ children }: { children: React.ReactNode }) => (
    <AllProvidersWrapper
      session={session}
      queryClient={testQueryClient}
      theme={theme}
    >
      {children}
    </AllProvidersWrapper>
  )
}

// Utility for testing hooks
export const createHookWrapper = (options: CustomRenderOptions = {}) => {
  return createWrapper(options)
}

// Wait for loading states to complete
export const waitForLoadingToComplete = async () => {
  // Wait for any pending promises
  await new Promise(resolve => setTimeout(resolve, 0))
  
  // Wait for React to update
  await new Promise(resolve => {
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(resolve as FrameRequestCallback)
    } else {
      setTimeout(resolve, 16)
    }
  })
}

// Clean up after render tests
export const cleanupAfterRender = () => {
  // Reset viewport
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  })
  
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  })
  
  // Clear any pending timers
  jest.clearAllTimers()
  
  // Clear all mocks
  jest.clearAllMocks()
}

// Export the default render for convenience
export { render as defaultRender } from '@testing-library/react'

// Export common testing utilities
export {
  screen,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
  within,
  getByRole,
  getByText,
  getByLabelText,
  getByPlaceholderText,
  getByDisplayValue,
  getByAltText,
  getByTitle,
  getByTestId,
  queryByRole,
  queryByText,
  queryByLabelText,
  queryByPlaceholderText,
  queryByDisplayValue,
  queryByAltText,
  queryByTitle,
  queryByTestId,
  findByRole,
  findByText,
  findByLabelText,
  findByPlaceholderText,
  findByDisplayValue,
  findByAltText,
  findByTitle,
  findByTestId,
  getAllByRole,
  getAllByText,
  getAllByLabelText,
  getAllByPlaceholderText,
  getAllByDisplayValue,
  getAllByAltText,
  getAllByTitle,
  getAllByTestId,
  queryAllByRole,
  queryAllByText,
  queryAllByLabelText,
  queryAllByPlaceholderText,
  queryAllByDisplayValue,
  queryAllByAltText,
  queryAllByTitle,
  queryAllByTestId,
  findAllByRole,
  findAllByText,
  findAllByLabelText,
  findAllByPlaceholderText,
  findAllByDisplayValue,
  findAllByAltText,
  findAllByTitle,
  findAllByTestId,
} from '@testing-library/react'

export { userEvent } from '@testing-library/user-event'

// Export all render helpers
export const renderHelpers = {
  renderWithProviders,
  renderWithAuth,
  renderWithoutAuth,
  renderWithExpiredAuth,
  renderWithDarkTheme,
  renderForMobile,
  renderForTablet,
  renderForDesktop,
  createWrapper,
  createHookWrapper,
  waitForLoadingToComplete,
  cleanupAfterRender,
}

export default renderWithProviders