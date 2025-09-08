// NextAuth type extensions
import { UserRole } from './prisma';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email: string;
      image?: string | null;
      role: UserRole | string;
      isEmailVerified: boolean;
      onboardingCompleted: boolean;
      anonymousId?: string;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
    role: UserRole | string;
    isEmailVerified: boolean;
    onboardingCompleted: boolean;
    anonymousId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub?: string;
    name?: string | null;
    email?: string;
    picture?: string | null;
    id: string;
    role: UserRole | string;
    isEmailVerified?: boolean;
    onboardingCompleted?: boolean;
    anonymousId?: string;
  }
}