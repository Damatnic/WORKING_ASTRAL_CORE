import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// GET /api/helper/clients - Get all clients for a helper
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
      select: { 
        id: true, 
        isVerified: true,
        acceptingClients: true 
      }
    });

    if (!helperProfile || !helperProfile.isVerified) {
      return NextResponse.json(
        { error: 'Not a verified helper' },
        { status: 403 }
      );
    }

    // Get all support sessions for this helper with client information
    const sessions = await prisma.supportSession.findMany({
      where: {
        helperId: session.user.id,
        userId: { not: null }
      },
      select: {
        id: true,
        userId: true,
        sessionType: true,
        status: true,
        rating: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        User_SupportSession_userIdToUser: {
          select: {
            id: true,
            anonymousId: true,
            displayName: true,
            email: true,
            lastActiveAt: true,
            UserProfile: {
              select: {
                mentalHealthGoals: true,
                interestedTopics: true,
                crisisContacts: true
              }
            },
            MoodEntry: {
              take: 10,
              orderBy: { createdAt: 'desc' },
              select: {
                moodScore: true,
                createdAt: true
              }
            },
            SafetyPlan: {
              select: {
                warningSignsEncrypted: true,
                copingStrategiesEncrypted: true,
                supportContactsEncrypted: true,
                lastReviewedAt: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group sessions by client and calculate statistics
    const clientMap = new Map();
    
    sessions.forEach(session => {
      const client = (session as any).User_SupportSession_userIdToUser;
      if (!client) return;
      
      const clientId = client.id;
      
      if (!clientMap.has(clientId)) {
        // Calculate risk level based on mood entries and safety plan
        let riskLevel = 'low';
        const safetyPlan = client.SafetyPlan?.[0];
        if (client.MoodEntry.length > 0) {
          const avgMood = client.MoodEntry.reduce((sum: number, entry: any) => sum + entry.moodScore, 0) / client.MoodEntry.length;
          if (avgMood <= 3) riskLevel = 'high';
          else if (avgMood <= 5) riskLevel = 'medium';
        }

        // Calculate progress (simplified - in production would use more sophisticated metrics)
        const completedSessions = sessions.filter(s => 
          s.userId === clientId && s.status === 'completed'
        ).length;
        const progress = Math.min(100, completedSessions * 10); // 10% per completed session

        clientMap.set(clientId, {
          id: clientId,
          userId: clientId,
          anonymousId: client.anonymousId,
          displayName: client.displayName || 'Anonymous',
          email: client.email,
          assignedDate: session.createdAt,
          lastContact: session.startedAt || session.createdAt,
          status: session.status === 'completed' ? 'active' : 'inactive',
          riskLevel,
          totalSessions: 0,
          completedSessions: 0,
          cancelledSessions: 0,
          sessionCount: 0,
          progress,
          goals: client.UserProfile?.mentalHealthGoals || [],
          notes: client.UserProfile?.bio || '',
          nextAppointment: null // Would need to implement appointment system
        });
      }
      
      const clientData = clientMap.get(clientId);
      clientData.totalSessions++;
      if (session.status === 'completed') clientData.completedSessions++;
      if (session.status === 'cancelled') clientData.cancelledSessions++;
      clientData.sessionCount = clientData.completedSessions;
      
      // Update last contact
      if (session.startedAt && (!clientData.lastContact || session.startedAt > clientData.lastContact)) {
        clientData.lastContact = session.startedAt;
      }
    });

    const clients = Array.from(clientMap.values());

    return NextResponse.json({
      clients,
      total: clients.length
    });
  } catch (error) {
    console.error('Error fetching helper clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

// POST /api/helper/clients - Add a new client
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
      select: { 
        id: true, 
        isVerified: true,
        acceptingClients: true,
        currentClients: true,
        maxClients: true
      }
    });

    if (!helperProfile || !helperProfile.isVerified) {
      return NextResponse.json(
        { error: 'Not a verified helper' },
        { status: 403 }
      );
    }

    if (!helperProfile.acceptingClients) {
      return NextResponse.json(
        { error: 'Not accepting new clients' },
        { status: 400 }
      );
    }

    if (helperProfile.currentClients >= helperProfile.maxClients) {
      return NextResponse.json(
        { error: 'Maximum client limit reached' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const schema = z.object({
      clientId: z.string(),
      sessionType: z.enum(['chat', 'video', 'phone', 'in_person']).default('chat'),
      notes: z.string().optional()
    });

    const data = schema.parse(body);

    // Check if client exists
    const client = await prisma.user.findUnique({
      where: { id: data.clientId },
      select: { id: true }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Create initial support session
    const supportSession = await prisma.supportSession.create({
        data: {
          id: `session-${Date.now()}`,
        userId: data.clientId,
        helperId: session.user.id,
        sessionType: data.sessionType,
        status: 'scheduled',
        encryptedNotes: data.notes ? { notes: data.notes } : null as any
      }
    });

    // Update helper's client count
    await prisma.helperProfile.update({
      where: { id: helperProfile.id },
      data: {
        currentClients: {
          increment: 1
        }
      }
    });

    return NextResponse.json({
      success: true,
      sessionId: supportSession.id
    });
  } catch (error) {
    console.error('Error adding client:', error);
    return NextResponse.json(
      { error: 'Failed to add client' },
      { status: 500 }
    );
  }
}