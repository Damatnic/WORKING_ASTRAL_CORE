import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';
import { UserRole } from '@prisma/client';

// Mock session types
interface MockSession extends Omit<Session, 'user'> {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
    avatar: string | null;
  };
  expires: string;
}

// Test wrapper component
interface TestWrapperProps {
  children: React.ReactNode;
  session?: MockSession | null;
}

const TestWrapper: React.FC<TestWrapperProps> = ({ children, session = null }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider session={session as Session}>
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
};

// Custom render function
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: MockSession | null;
}

export const renderWithProviders = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { session, ...renderOptions } = options;

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestWrapper session={session}>{children}</TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Session fixtures
export const sessionFixtures = {
  adminSession: {
    user: {
      id: 'admin-id',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      avatar: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as MockSession,

  therapistSession: {
    user: {
      id: 'therapist-id',
      email: 'therapist@example.com',
      firstName: 'Therapist',
      lastName: 'User',
      role: UserRole.THERAPIST,
      avatar: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as MockSession,

  userSession: {
    user: {
      id: 'user-id',
      email: 'user@example.com',
      firstName: 'Regular',
      lastName: 'User',
      role: UserRole.USER,
      avatar: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } as MockSession,

  expiredSession: {
    user: {
      id: 'expired-user-id',
      email: 'expired@example.com',
      firstName: 'Expired',
      lastName: 'User',
      role: UserRole.USER,
      avatar: null,
    },
    expires: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  } as MockSession,
};

// Helper functions for different user types
export const renderWithUser = (ui: React.ReactElement, userType: keyof typeof sessionFixtures = 'userSession') => {
  const sessionMap = {
    adminSession: sessionFixtures.adminSession,
    therapistSession: sessionFixtures.therapistSession,
    userSession: sessionFixtures.userSession,
    expiredSession: sessionFixtures.expiredSession,
  };

  return renderWithProviders(ui, {
    session: sessionMap[userType],
  });
};

export const renderWithAdmin = (ui: React.ReactElement) => {
  return renderWithProviders(ui, {
    session: sessionFixtures.adminSession,
  });
};

export const renderWithTherapist = (ui: React.ReactElement) => {
  return renderWithProviders(ui, {
    session: sessionFixtures.therapistSession,
  });
};

export const renderWithExpiredSession = (ui: React.ReactElement) => {
  return renderWithProviders(ui, {
    session: sessionFixtures.expiredSession,
  });
};

export const renderWithoutSession = (ui: React.ReactElement) => {
  return renderWithProviders(ui, {
    session: null,
  });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { renderWithProviders as render };
