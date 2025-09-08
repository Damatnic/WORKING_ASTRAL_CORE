import { NextAuthOptions, User, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { UserRole } from "@prisma/client";

// Extend the built-in session type
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: UserRole;
      isEmailVerified: boolean;
      onboardingCompleted: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    isEmailVerified: boolean;
    onboardingCompleted: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    isEmailVerified: boolean;
    onboardingCompleted: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile: any) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          role: UserRole.USER,
          isEmailVerified: profile.email_verified || false,
          onboardingCompleted: false,
        };
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // TODO: Add proper user validation with database
        // For now, return a mock user for development
        if (credentials.email === "test@example.com" && credentials.password === "password123") {
          return {
            id: "test-user-id",
            email: credentials.email,
            name: "Test User",
            role: UserRole.USER,
            isEmailVerified: true,
            onboardingCompleted: true,
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.role = user.role;
        token.isEmailVerified = user.isEmailVerified;
        token.onboardingCompleted = user.onboardingCompleted;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role;
        session.user.isEmailVerified = token.isEmailVerified;
        session.user.onboardingCompleted = token.onboardingCompleted;
      }
      return session;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

// Helper function to check if user has specific role
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

// Helper function to check if user has permission
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const rolePermissions = {
    [UserRole.USER]: [
      "read:profile",
      "update:profile",
      "create:posts",
      "read:community",
      "create:appointments",
    ],
    [UserRole.HELPER]: [
      "read:profile",
      "update:profile",
      "create:posts",
      "read:community",
      "manage:sessions",
      "respond:crisis",
    ],
    [UserRole.THERAPIST]: [
      "read:profile",
      "update:profile",
      "create:posts",
      "read:community",
      "manage:sessions",
      "respond:crisis",
      "access:professional_tools",
    ],
    [UserRole.CRISIS_COUNSELOR]: [
      "read:profile",
      "update:profile",
      "manage:sessions",
      "respond:crisis",
      "access:crisis_tools",
      "escalate:emergency",
    ],
    [UserRole.ADMIN]: [
      "read:profile",
      "update:profile",
      "moderate:content",
      "manage:users",
      "access:analytics",
      "manage:helpers",
    ],
    [UserRole.SUPER_ADMIN]: [
      "all:permissions", // Super admin has all permissions
    ],
  };

  const permissions = rolePermissions[userRole] || [];
  return permissions.includes("all:permissions") || permissions.includes(permission);
}