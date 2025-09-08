import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/helper/sessions - Get all sessions for a helper
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is a verified helper
    const helperProfile = await prisma.helperProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, isVerified: true }
    });

    if (!helperProfile || !helperProfile.isVerified) {
      return NextResponse.json(
        { error: 'Not a verified helper' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query filters
    const where: any = {
      helperId: session.user.id
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    // Get sessions with client information
    const sessions = await prisma.supportSession.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: [
        { status: 'asc' }, // Active sessions first
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        userId: true,
        sessionType: true,
        status: true,
        rating: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        encryptedNotes: true,
        User_SupportSession_userIdToUser: {
          select: {
            id: true,
            anonymousId: true,
            displayName: true,
            UserProfile: {
              select: {
                
              }
            }
          }
        }
      }
    });

    // Transform sessions for frontend
    const transformedSessions = sessions.map(session => {
      const duration = session.startedAt && session.endedAt 
        ? Math.floor((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
        : 0;

      return {
        id: session.id,
        clientId: session.userId,
        clientName: (session as any).User_SupportSession_userIdToUser?.displayName || 'Anonymous',
        anonymousId: (session as any).User_SupportSession_userIdToUser?.anonymousId || 'Unknown',
        type: session.sessionType,
        status: session.status,
        scheduledTime: session.createdAt,
        startTime: session.startedAt,
        endTime: session.endedAt,
        duration,
        rating: session.rating,
        topics: (session as any).User_SupportSession_userIdToUser?.UserProfile?.interestedTopics || [],
        notes: session.encryptedNotes
      };
    });

    // Get total count for pagination
    const totalCount = await prisma.supportSession.count({ where });

    return NextResponse.json({
      sessions: transformedSessions,
      total: totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount
    });
  } catch (error) {
    console.error('Error fetching helper sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

// POST /api/helper/sessions - Create a new session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is a verified helper
    const helperProfile = await prisma.helperProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, isVerified: true }
    });

    if (!helperProfile || !helperProfile.isVerified) {
      return NextResponse.json(
        { error: 'Not a verified helper' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const schema = z.object({
      clientId: z.string(),
      sessionType: z.enum(['chat', 'video', 'phone', 'in_person']),
      scheduledAt: z.string().optional(),
      notes: z.string().optional()
    });

    const data = schema.parse(body);

    // Create new session
    const newSession = await prisma.supportSession.create({
        data: {
          id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: data.clientId,
        helperId: session.user.id,
        sessionType: data.sessionType,
        status: 'scheduled',
        encryptedNotes: data.notes ? { notes: data.notes } : null as any,
        createdAt: data.scheduledAt ? new Date(data.scheduledAt) : new Date()
      }
    });

    return NextResponse.json({
      success: true,
      session: newSession
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// PATCH /api/helper/sessions - Update session status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const schema = z.object({
      sessionId: z.string(),
      status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']),
      rating: z.number().min(1).max(5).optional(),
      notes: z.string().optional()
    });

    const data = schema.parse(body);

    // Check if session belongs to this helper
    const supportSession = await prisma.supportSession.findFirst({
      where: {
        id: data.sessionId,
        helperId: session.user.id
      }
    });

    if (!supportSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Update session
    const updateData: any = {
      status: data.status
    };

    if (data.status === 'in_progress') {
      updateData.startedAt = new Date();
    } else if (data.status === 'completed') {
      updateData.endedAt = new Date();
      if (!supportSession.startedAt) {
        updateData.startedAt = new Date();
      }
    }

    if (data.rating) {
      updateData.rating = data.rating;
    }

    if (data.notes) {
      updateData.encryptedNotes = { 
        ...((supportSession.encryptedNotes as any) || {}),
        notes: data.notes,
        updatedAt: new Date().toISOString()
      };
    }

    const updatedSession = await prisma.supportSession.update({
      where: { id: data.sessionId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}