// @ts-nocheck
// API Routes for Support Groups
import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { z } from 'zod';
import { groupCreationSchema } from '@/types/community';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// GET: Fetch all support groups
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const topic = searchParams.get('topic');
    const type = searchParams.get('type');
    const privacy = searchParams.get('privacy');

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (topic && topic !== 'all') {
      where.topic = topic;
    }

    if (type) {
      where.type = type;
    }

    if (privacy) {
      where.privacy = privacy;
    }

    const groups = await prisma.supportGroup.findMany({
      where,
      include: {
        GroupMembership: {
          where: {
            isActive: true,
          },
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            GroupMembership: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform data for frontend
    const transformedGroups = groups.map((group: any) => ({
      ...group,
      currentMembers: group.GroupMembership.map((m: any) => m.userId),
      nextSession: group.sessions[0]?.scheduledAt || null,
      memberCount: group._count.GroupMembership,
    }));

    return NextResponse.json(transformedGroups);
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support groups' },
      { status: 500 }
    );
  }
}

// POST: Create a new support group
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate input
    const validatedData = groupCreationSchema.parse(body);

    // Get user's anonymous identity
    const identity = await prisma.anonymousIdentity.findUnique({
      where: {
        userId: session.user.id!,
      },
    });

    if (!identity) {
      return NextResponse.json(
        { error: 'Anonymous identity not found' },
        { status: 404 }
      );
    }

    // Check trust score requirement
    const trustMetric = await prisma.trustMetric.findUnique({
      where: {
        userId: session.user.id!,
      },
    });

    if (!trustMetric || trustMetric.score < 100) {
      return NextResponse.json(
        { error: 'Insufficient trust score to create groups' },
        { status: 403 }
      );
    }

    // Create the group
    const group = await (prisma.supportGroup as any).create({
        data: {
          id: generatePrismaCreateFields().id,name: validatedData.name,
        topic: validatedData.topic,
        description: validatedData.description,
        maxMembers: validatedData.maxMembers,
        privacy: validatedData.privacy,
        type: body.type || 'peer_support',
        facilitatorId: session.user.id!,
        schedule: body.schedule || {},
        requirements: body.requirements || {
          languages: ['en'],
          minTrustScore: 0,
        },
        resources: [],
        tags: body.tags || [],
        GroupMembership: {
          create: {
            id: crypto.randomUUID(),
            userId: identity.id,
            role: 'facilitator',
          },
        },
      },
      include: {
        GroupMembership: true,
      },
    });

    // Update trust score for creating a group
    await prisma.trustMetric.update({
      where: {
        userId: session.user.id!,
      },
      data: {
        score: {
          increment: 20,
        },
        history: {
          push: {
            type: 'positive',
            description: 'Created support group',
            impact: 20,
            timestamp: new Date(),
          },
        },
        lastUpdated: new Date(),
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: (error as any).issues },
        { status: 400 }
      );
    }

    console.error('Failed to create group:', error);
    return NextResponse.json(
      { error: 'Failed to create support group' },
      { status: 500 }
    );
  }
}