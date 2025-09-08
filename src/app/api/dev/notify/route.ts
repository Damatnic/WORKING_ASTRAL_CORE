import { NextRequest, NextResponse } from 'next/server';
import { createApiErrorHandler } from '@/lib/api-error-handler';

export async function POST(req: NextRequest) {
  try {
    // Optional guard: require dev mode
    if (process.env.NODE_ENV === 'production') {
      return createApiErrorHandler('FORBIDDEN', 'Dev notify not available in production', 403);
    }
    
    // For development, just return success without actually emitting
    // The socket server will be initialized when the app runs normally
    const body = await (req as any).json();
    const { event = 'notification', payload = { title: 'Test', body: 'Hello!' } } = body || {};
    
    console.log(`[DEV] Would emit ${event} with payload:`, payload);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Dev notification logged (socket server not initialized during build)' 
    }), { status: 200 });
  } catch (error) {
    console.error('Dev notify error:', error);
    return createApiErrorHandler('DEV_NOTIFY_ERROR', 'Failed to emit notification', 500);
  }
}

