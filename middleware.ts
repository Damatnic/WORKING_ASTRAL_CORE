/**
 * Next.js Middleware Entry Point
 * Handles authentication, security, and routing
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { UserRole } from './src/types/prisma';

// Protected route configurations
const protectedRoutes = {
  // User routes - require authentication
  user: [
    '/dashboard',
    '/profile',
    '/wellness',
    '/mood-tracker',
    '/journal',
    '/appointments',
    '/community',
  ],
  // Helper/Therapist routes - require helper role or above
  helper: [
    '/helper-dashboard',
    '/therapist-dashboard',
    '/sessions',
    '/clients',
  ],
  // Crisis counselor routes
  crisis: [
    '/crisis-dashboard',
    '/crisis-intervention',
    '/emergency-protocols',
  ],
  // Admin routes - require admin role
  admin: [
    '/admin-dashboard',
    '/admin',
    '/users',
    '/analytics',
    '/moderation',
  ],
};

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/auth/signin',
  '/auth/signup',
  '/auth/error',
  '/auth/verify-request',
  '/auth/verify-email',
  '/auth/reset-password',
  '/api/auth',
  '/api/health',
  '/api/info',
  '/status',
  '/resources',
  '/about',
  '/privacy',
  '/terms',
];

// API routes that require authentication
const protectedApiRoutes = [
  '/api/user',
  '/api/profile',
  '/api/sessions',
  '/api/wellness',
  '/api/mood',
  '/api/journal',
  '/api/community',
  '/api/crisis',
  '/api/appointments',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and internal Next.js routes
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/_next/') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Dynamic import to resolve module issues with NextAuth v4
  const jwt = await import('next-auth/jwt');
  const getToken = (jwt as any).getToken || (jwt as any).default?.getToken;
  
  // Get the token to check authentication status
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;
  const userRole = token?.role as UserRole;

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // Handle authentication for protected routes
  if (!isPublicRoute && !isAuthenticated) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Handle role-based access control
  if (isAuthenticated && token) {
    // Check email verification for non-admin users
    if (!token.isEmailVerified && userRole !== UserRole.SUPER_ADMIN) {
      const emailVerificationRequiredRoutes = [
        ...protectedRoutes.user,
        ...protectedRoutes.helper,
        ...protectedRoutes.crisis,
      ];
      
      if (emailVerificationRequiredRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/auth/verify-email', request.url));
      }
    }

    // Check onboarding completion
    if (!token.onboardingCompleted) {
      const onboardingRequiredRoutes = [
        ...protectedRoutes.user,
        ...protectedRoutes.helper,
        ...protectedRoutes.crisis,
      ];
      
      if (onboardingRequiredRoutes.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    }

    // Role-based route protection
    const isHelperRoute = protectedRoutes.helper.some(route => pathname.startsWith(route));
    const isCrisisRoute = protectedRoutes.crisis.some(route => pathname.startsWith(route));
    const isAdminRoute = protectedRoutes.admin.some(route => pathname.startsWith(route));

    // Check helper route access
    if (isHelperRoute) {
      const helperRoles = [
        UserRole.HELPER,
        UserRole.THERAPIST,
        UserRole.CRISIS_COUNSELOR,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ] as const;
      
      const hasHelperAccess = userRole && helperRoles.includes(userRole as typeof helperRoles[number]);

      if (!hasHelperAccess) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Check crisis route access
    if (isCrisisRoute) {
      const crisisRoles = [
        UserRole.CRISIS_COUNSELOR,
        UserRole.ADMIN,
        UserRole.SUPER_ADMIN,
      ] as const;
      
      const hasCrisisAccess = userRole && crisisRoles.includes(userRole as typeof crisisRoles[number]);

      if (!hasCrisisAccess) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Check admin route access
    if (isAdminRoute) {
      const adminRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN] as const;
      const hasAdminAccess = userRole && adminRoles.includes(userRole as typeof adminRoles[number]);

      if (!hasAdminAccess) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Redirect to appropriate dashboard based on role
    if (pathname === '/dashboard') {
      const dashboardMap = {
        [UserRole.USER]: '/dashboard',
        [UserRole.HELPER]: '/helper-dashboard',
        [UserRole.THERAPIST]: '/therapist-dashboard',
        [UserRole.CRISIS_COUNSELOR]: '/crisis-dashboard',
        [UserRole.ADMIN]: '/admin-dashboard',
        [UserRole.SUPER_ADMIN]: '/admin-dashboard',
      };

      const appropriateDashboard = dashboardMap[userRole];
      if (appropriateDashboard && pathname !== appropriateDashboard) {
        return NextResponse.redirect(new URL(appropriateDashboard, request.url));
      }
    }
  }

  // Handle API route protection
  if (pathname.startsWith('/api/')) {
    const isProtectedApiRoute = protectedApiRoutes.some(route => 
      pathname.startsWith(route)
    );

    if (isProtectedApiRoute && !isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Add user info to headers for API routes
    if (isAuthenticated && token) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', token.sub!);
      requestHeaders.set('x-user-role', userRole);
      requestHeaders.set('x-user-verified', token.isEmailVerified.toString());
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};