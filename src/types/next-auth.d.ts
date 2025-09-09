import { UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      image?: string;
      role: UserRole;
      anonymousId?: string;
      isEmailVerified?: boolean;
      onboardingCompleted?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
    role: UserRole;
    anonymousId?: string;
    isEmailVerified?: boolean;
    onboardingCompleted?: boolean;
  }

  interface JWT {
    id: string;
    email: string;
    role: UserRole;
    anonymousId?: string;
    isEmailVerified?: boolean;
    onboardingCompleted?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    role: UserRole;
    anonymousId?: string;
    isEmailVerified?: boolean;
    onboardingCompleted?: boolean;
  }
}