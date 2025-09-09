import { NextRequest, NextResponse } from 'next/server';
import { WebSocketServer } from '@/lib/websocket/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

let wss: WebSocketServer | null = null;

export async function GET(request: NextRequest) {
  // Initialize WebSocket server if not already done
  if (!wss) {
    wss = new WebSocketServer();
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 400 });
  }

  try {
    // Handle WebSocket upgrade
    const response = await (wss as any).handleUpgrade(request, token);
    return response;
  } catch (error) {
    console.error('WebSocket upgrade error:', error);
    return new Response('WebSocket upgrade failed', { status: 500 });
  }
}