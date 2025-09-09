
// System Information API Route
// Provides demo credentials and system information

import { NextRequest, NextResponse } from 'next/server';
import { ensureInitialized, getInitializationInfo } from '@/lib/auto-init';
import { aiService } from '@/lib/ai-service';

export const dynamic = 'force-dynamic';

/**
 * System information endpoint
 * GET /api/info
 */
export async function GET(request: NextRequest) {
  try {
    // Ensure system is initialized
    await ensureInitialized();
    
    // Get initialization info including demo credentials
    const initInfo = await getInitializationInfo();
    
    // Get AI service configuration
    const aiConfig = aiService.isConfigured();
    
    const systemInfo = {
      name: 'Astral Core V5',
      description: 'Mental Health Support Platform',
      version: '1.0.0',
      status: initInfo.initialized ? 'ready' : 'initializing',
      features: [
        'AI-Powered Therapy Assistant',
        'Crisis Intervention System',
        'Peer Support Communities',
        'Wellness Tracking',
        'Anonymous Support Groups',
        '24/7 Crisis Resources'
      ],
      demoAccess: initInfo.demoCredentials ? {
        available: true,
        accounts: [
          {
            role: 'User',
            email: initInfo.demoCredentials.user.email,
            password: initInfo.demoCredentials.user.password,
            description: 'Standard user account for exploring the platform'
          },
          {
            role: 'Helper',
            email: initInfo.demoCredentials.helper.email,
            password: initInfo.demoCredentials.helper.password,
            description: 'Support helper account with moderation capabilities'
          },
          {
            role: 'Admin',
            email: initInfo.demoCredentials.admin.email,
            password: initInfo.demoCredentials.admin.password,
            description: 'Administrator account with full platform access'
          }
        ],
        note: 'Demo accounts are automatically created and reset periodically'
      } : {
        available: false,
        message: 'System is still initializing. Please try again in a moment.'
      },
      deployment: {
        platform: 'Vercel',
        environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
        region: process.env.VERCEL_REGION || 'unknown',
        url: process.env.VERCEL_URL || 'localhost:3000',
      },
      aiServices: {
        openai: {
          configured: aiConfig.openai,
          status: aiConfig.openai ? '✅ Ready' : '❌ Not configured'
        },
        gemini: {
          configured: aiConfig.gemini,
          status: aiConfig.gemini ? '✅ Ready' : '❌ Not configured'
        },
        defaultProvider: aiConfig.openai ? 'OpenAI GPT-4' : aiConfig.gemini ? 'Google Gemini' : 'None',
        therapyAssistant: aiConfig.openai || aiConfig.gemini ? 'Available' : 'Unavailable'
      },
      endpoints: {
        health: '/api/health',
        status: '/status',
        aiChat: '/api/ai/chat',
        documentation: '/docs',
        demo: '/demo',
      },
      lastUpdated: initInfo.timestamp,
    };
    
    // Return with caching headers
    return NextResponse.json(systemInfo, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('Info endpoint error:', error);
    
    return NextResponse.json(
      {
        name: 'Astral Core V5',
        status: 'error',
        message: 'Failed to load system information',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

/**
 * Force refresh system information
 * POST /api/info
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'refresh') {
      // Force re-initialization
      const { forceReinitialize } = await import('@/lib/auto-init');
      await forceReinitialize();
      
      return NextResponse.json({
        message: 'System information refreshed',
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use { "action": "refresh" }' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Info refresh error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to refresh system information',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}