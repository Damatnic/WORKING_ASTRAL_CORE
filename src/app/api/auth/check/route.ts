
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/check
 * Check current authentication status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (session?.user) {
      const user = session.user as any;
      return NextResponse.json({
        success: true,
        data: {
          isAuthenticated: true,
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            onboardingCompleted: user.onboardingCompleted,
          }
        },
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: true,
        data: {
          isAuthenticated: false,
          message: 'Not authenticated'
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication check failed',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Placeholder for future POST authentication
    const body = await request.json().catch(() => ({}));
    
    return NextResponse.json({
      success: true,
      message: 'POST endpoint placeholder - authentication not yet implemented',
      received: body,
      timestamp: new Date().toISOString()
    }, { 
      status: 200 
    });
  } catch (error) {
    console.error('Auth POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    });
  }
}