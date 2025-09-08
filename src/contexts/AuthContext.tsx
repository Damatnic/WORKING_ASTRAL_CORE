'use client';

import React, { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { useSession, signOut } from 'next-auth/react';
import { UserRole } from '@prisma/client';

// Re-export useSession for convenience
export { useSession, signOut } from 'next-auth/react';

interface AuthProviderProps {
  children: ReactNode;
  session?: any;
}

// Main AuthProvider that wraps NextAuth SessionProvider - CLIENT COMPONENT
export function AuthProvider({ children, session }: AuthProviderProps) {
  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}

// Custom hook that extends NextAuth's useSession with our app-specific logic
export function useAuth() {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated' && !!session;

  // Anonymous login function (creates a temporary session)
  const loginAnonymously = async () => {
    // For anonymous users, we'll create a temporary client-side session
    const anonymousUser = {
      id: 'anon_' + Date.now(),
      name: 'Anonymous User',
      isAnonymous: true,
      role: UserRole.USER,
      sessionId: 'anon_session_' + Date.now(),
    };
    
    // Store in localStorage for anonymous sessions
    localStorage.setItem('anonymous-session', JSON.stringify(anonymousUser));
    
    // Trigger a custom event to notify components
    window.dispatchEvent(new CustomEvent('anonymous-login', { detail: anonymousUser }));
  };

  // Logout function that handles both authenticated and anonymous sessions
  const logout = async () => {
    // Clear anonymous session if it exists
    localStorage.removeItem('anonymous-session');
    
    // Sign out from NextAuth if authenticated
    if (isAuthenticated) {
      await signOut({ redirect: false });
    }
    
    // Trigger custom event
    window.dispatchEvent(new CustomEvent('logout'));
  };

  // Update profile function (for authenticated users)
  const updateProfile = async (data: any) => {
    if (!isAuthenticated) {
      throw new Error('Must be authenticated to update profile');
    }

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  // Helper functions to check user role and permissions
  const hasRole = (roles: UserRole[]) => {
    if (!(session as any)?.user?.role) return false;
    return roles.includes(((session as any).user as any)?.role);
  };

  const isRole = (role: UserRole) => {
    return (session as any)?.user?.role === role;
  };

  const canAccess = (resource: string) => {
    if (!(session as any)?.user?.role) return false;
    
    // Define access control rules
    const accessRules: Record<string, UserRole[]> = {
      dashboard: [UserRole.USER, UserRole.HELPER, UserRole.THERAPIST, UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      helper_dashboard: [UserRole.HELPER, UserRole.THERAPIST, UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      admin_panel: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      crisis_tools: [UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN],
      therapist_tools: [UserRole.THERAPIST, UserRole.ADMIN, UserRole.SUPER_ADMIN],
    };

    const allowedRoles = accessRules[resource] || [];
    return allowedRoles.includes(((session as any).user as any)?.role);
  };

  return {
    // Session data
    user: session?.user || null,
    session,
    isLoading,
    isAuthenticated,

    // User properties
    role: (session as any)?.user?.role || null,
    isEmailVerified: (session as any)?.user?.isEmailVerified || false,
    onboardingCompleted: (session as any)?.user?.onboardingCompleted || false,

    // Auth methods
    loginAnonymously,
    logout,
    updateProfile,

    // Role and permission helpers
    hasRole,
    isRole,
    canAccess,

    // Role checks
    isUser: isRole(UserRole.USER),
    isHelper: isRole(UserRole.HELPER),
    isTherapist: isRole(UserRole.THERAPIST),
    isCrisisCounselor: isRole(UserRole.CRISIS_COUNSELOR),
    isAdmin: isRole(UserRole.ADMIN),
    isSuperAdmin: isRole(UserRole.SUPER_ADMIN),

    // Permission checks
    canModerate: canAccess('admin_panel'),
    canManageUsers: hasRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    canProvideSupport: hasRole([UserRole.HELPER, UserRole.THERAPIST, UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
    canHandleCrisis: hasRole([UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]),
  };
}