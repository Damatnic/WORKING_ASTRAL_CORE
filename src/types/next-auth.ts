import { DefaultSession, DefaultUser } from 'next-auth';
import { UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email: string;
      image?: string | null;
      role: UserRole;
      isEmailVerified: boolean;
      onboardingCompleted: boolean;
      anonymousId?: string;
    };
    expires: string;
  }

  interface User {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
    role: UserRole;
    isEmailVerified: boolean;
    onboardingCompleted: boolean;
    anonymousId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    isEmailVerified: boolean;
    onboardingCompleted: boolean;
    anonymousId?: string;
  }
}
