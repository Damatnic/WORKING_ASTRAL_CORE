const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing corrupted syntax errors...');

// Fix factories.ts
const factoriesPath = 'src/lib/test-utils/factories.ts';
const factoriesContent = `import { faker } from '@faker-js/faker';
import { User, UserRole, Post, Comment, Session, CrisisAlert, SafetyPlan } from '@prisma/client';

// User factory
export const createMockUser = (overrides: Partial<User> = {}): User => {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    anonymousId: faker.string.uuid(),
    email: faker.internet.email(),
    hashedPassword: faker.internet.password(),
    role: UserRole.USER,
    permissions: [],
    isActive: true,
    isEmailVerified: false,
    avatar: faker.image.avatar(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    dateOfBirth: faker.date.past(),
    phoneNumber: faker.phone.number(),
    emergencyContact: faker.person.fullName(),
    emergencyPhone: faker.phone.number(),
    preferredLanguage: 'en',
    timezone: 'UTC',
    isVerified: true,
    mfaEnabled: false,
    lastLoginAt: faker.date.recent(),
    loginAttempts: 0,
    lockedUntil: null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

// Enhanced user factory with specific roles
export const createMockUserWithRole = (role: UserRole, overrides: Partial<User> = {}): User => {
  const baseUser = createMockUser(overrides);
  return {
    ...baseUser,
    role,
    permissions: role === UserRole.ADMIN ? ['admin', 'user'] : ['user'],
  };
};

// Admin user factory
export const createMockAdmin = (overrides: Partial<User> = {}): User => {
  return createMockUserWithRole(UserRole.ADMIN, {
    email: 'admin@example.com',
    isEmailVerified: true,
    ...overrides,
  });
};

// Therapist user factory
export const createMockTherapist = (overrides: Partial<User> = {}): User => {
  return createMockUserWithRole(UserRole.THERAPIST, {
    email: 'therapist@example.com',
    isEmailVerified: true,
    ...overrides,
  });
};

// Patient user factory
export const createMockPatient = (overrides: Partial<User> = {}): User => {
  return createMockUserWithRole(UserRole.USER, {
    email: 'patient@example.com',
    ...overrides,
  });
};

// Post factory
export const createMockPost = (overrides: Partial<Post> = {}): Post => {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(),
    authorId: faker.string.uuid(),
    published: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

// Comment factory
export const createMockComment = (overrides: Partial<Comment> = {}): Comment => {
  return {
    id: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    authorId: faker.string.uuid(),
    postId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

// Session factory
export const createMockSession = (overrides: Partial<Session> = {}): Session => {
  return {
    id: faker.string.uuid(),
    sessionToken: faker.string.alphanumeric(32),
    userId: faker.string.uuid(),
    expires: faker.date.future(),
    ...overrides,
  };
};

// Crisis Alert factory
export const createMockCrisisAlert = (overrides: Partial<CrisisAlert> = {}): CrisisAlert => {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    severity: 'MEDIUM',
    message: faker.lorem.sentence(),
    resolved: false,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

// Safety Plan factory
export const createMockSafetyPlan = (overrides: Partial<SafetyPlan> = {}): SafetyPlan => {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    title: faker.lorem.words(3),
    content: faker.lorem.paragraphs(),
    isActive: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

// Batch factories
export const createMockUsers = (count: number = 5): User[] => {
  return Array.from({ length: count }, () => createMockUser());
};

export const createMockPosts = (count: number = 5): Post[] => {
  return Array.from({ length: count }, () => createMockPost());
};

export const createMockComments = (count: number = 5): Comment[] => {
  return Array.from({ length: count }, () => createMockComment());
};
`;

// Fix render-helpers.tsx
const renderHelpersPath = 'src/lib/test-utils/render-helpers.tsx';
const renderHelpersContent = `import React from 'react';
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
`;

// Fix crisis-manager.ts - just the corrupted parts
const crisisManagerPath = 'src/lib/websocket/crisis-manager.ts';
fs.readFile(crisisManagerPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading crisis-manager.ts:', err);
    return;
  }

  // Fix the corrupted sections
  let fixedContent = data
    .replace(/} catch \(error\) \{[\s\S]*?console\.error\('Error creating safety alert:', error\);[\s\S]*?}\s*}/g, `} catch (error) {
      console.error('Error creating safety alert:', error);
      throw error;
    }`)
    .replace(/} catch \(error\) \{[\s\S]*?console\.error\('Error updating safety alert:', error\);[\s\S]*?}\s*}/g, `} catch (error) {
      console.error('Error updating safety alert:', error);
      throw error;
    }`)
    .replace(/private async logCrisisEvent\([\s\S]*?}\s*}/g, `private async logCrisisEvent(
    userId: string,
    eventType: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId,
          action: eventType,
          resource: 'crisis_alert',
          details: JSON.stringify(details),
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Error logging crisis event:', error);
    }
  }`);

  fs.writeFile(crisisManagerPath, fixedContent, 'utf8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing crisis-manager.ts:', writeErr);
    } else {
      console.log('✅ Fixed crisis-manager.ts');
    }
  });
});

// Fix analytics service - just the corrupted parts
const analyticsServicePath = 'src/services/analytics/analyticsService.ts';
fs.readFile(analyticsServicePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading analyticsService.ts:', err);
    return;
  }

  // Fix the corrupted sections
  let fixedContent = data
    .replace(/} catch \(error\) \{[\s\S]*?console\.error\('Error generating mood analytics:', error\);[\s\S]*?}\s*}/g, `} catch (error) {
      console.error('Error generating mood analytics:', error);
      throw error;
    }`)
    .replace(/private async processCrisisAlertAnalytics\([\s\S]*?}\s*}/g, `private async processCrisisAlertAnalytics(event: AnalyticsEvent): Promise<void> {
    console.log('Processing crisis alert analytics:', event.eventName);
  }`)
    .replace(/private async processSafetyPlanAnalytics\([\s\S]*?}\s*}/g, `private async processSafetyPlanAnalytics(event: AnalyticsEvent): Promise<void> {
    console.log('Processing safety plan activation analytics:', event.eventName);
  }`)
    .replace(/private async processEmergencyContactAnalytics\([\s\S]*?}\s*}/g, `private async processEmergencyContactAnalytics(event: AnalyticsEvent): Promise<void> {
    console.log('Processing emergency contact analytics:', event.eventName);
  }`);

  fs.writeFile(analyticsServicePath, fixedContent, 'utf8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing analyticsService.ts:', writeErr);
    } else {
      console.log('✅ Fixed analyticsService.ts');
    }
  });
});

// Write the fixed files
fs.writeFileSync(factoriesPath, factoriesContent);
console.log('✅ Fixed factories.ts');

fs.writeFileSync(renderHelpersPath, renderHelpersContent);
console.log('✅ Fixed render-helpers.tsx');

console.log('✅ Syntax error fixes completed!');