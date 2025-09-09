import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // WebSocket connections are handled by the custom server setup
  // This API route provides WebSocket connection details

  return NextResponse.json({
    message: 'WebSocket server is running',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    status: 'active'
  });
}