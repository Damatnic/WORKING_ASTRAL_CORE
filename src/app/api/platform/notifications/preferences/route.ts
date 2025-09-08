import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// GET /api/platform/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create preferences
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: user.id  }
    });

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.notificationPreference.create({
        data: {
          id: generatePrismaCreateFields().id,userId: user.id ,
          // metadata: {
//             in_app: {
//               enabled: true,
//               categories: ['crisis', 'therapy', 'community', 'system', 'wellness', 'appointment', 'safety'],
//               quietHours: {
//                 enabled: false,
//                 start: '22:00',
//                 end: '08:00',
//                 timezone: 'America/New_York'
//               }
//             },
//             email: {
//               enabled: true,
//               categories: ['crisis', 'therapy', 'appointment', 'system'],
//               quietHours: {
//                 enabled: false,
//                 start: '22:00',
//                 end: '08:00',
//                 timezone: 'America/New_York'
//               }
//             },
//             sms: {
//               enabled: true,
//               categories: ['crisis', 'appointment'],
//               quietHours: {
//                 enabled: true,
//                 start: '22:00',
//                 end: '08:00',
//                 timezone: 'America/New_York'
//               }
//             },
//             push: {
//               enabled: true,
//               categories: ['crisis', 'therapy', 'community', 'wellness'],
//               quietHours: {
//                 enabled: true,
//                 start: '23:00',
//                 end: '07:00',
//                 timezone: 'America/New_York'
//               }
//             },
//             phone_call: {
//               enabled: true,
//               categories: ['crisis'],
//               quietHours: {
//                 enabled: false,
//                 start: '22:00',
//                 end: '08:00',
//                 timezone: 'America/New_York'
//               }
//             }
//          },
          categories: ['crisis', 'therapy', 'community', 'system', 'wellness', 'appointment', 'safety'],
          digestFrequency: 'daily',
          crisisOverride: true,
          escalationChain: {
            escalationChain: [
              { method: 'phone_call', delay: 0 },
              { method: 'sms', delay: 2 },
              { method: 'email', delay: 5 }
            ]
          }
        }
      });
    }

    // Transform to match frontend interface
    const transformedPreferences = {
      userId: preferences.userId,
      channels: {
        email: preferences.emailEnabled,
        sms: preferences.smsEnabled,
        push: preferences.pushEnabled,
        inApp: preferences.inAppEnabled
      },
      priorities: {
        urgent: ['phone_call', 'sms', 'in_app', 'email'],
        high: ['sms', 'in_app', 'email'],
        medium: ['in_app', 'push', 'email'],
        low: ['in_app', 'email']
      },
      frequency: {
        digest: preferences.frequency,
        summaryTime: '08:00'
      },
      crisis: {
        alwaysNotify: true,
        escalationChain: []
      }
    };

    return NextResponse.json(transformedPreferences, { status: 200 });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' }, { status: 500 });
  }
}

// PUT /api/platform/notifications/preferences - Update notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    const channelSchema = z.object({
      enabled: z.boolean(),
      categories: z.array(z.string()),
      quietHours: z.object({
        enabled: z.boolean(),
        start: z.string(),
        end: z.string(),
        timezone: z.string()
      })
    });

    const preferencesSchema = z.object({
      channels: z.object({
        in_app: channelSchema,
        email: channelSchema,
        sms: channelSchema,
        push: channelSchema,
        phone_call: channelSchema
      }),
      priorities: z.record(z.array(z.string())).optional(),
      frequency: z.object({
        digest: z.enum(['immediate', 'hourly', 'daily', 'weekly', 'never']),
        summaryTime: z.string()
      }),
      crisis: z.object({
        alwaysNotify: z.boolean(),
        escalationChain: z.array(z.object({
          method: z.enum(['in_app', 'email', 'sms', 'push', 'phone_call']),
          delay: z.number()
        }))
      })
    });

    const validatedData = preferencesSchema.parse(body);

    // Update preferences
    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: user.id  },
      update: {
        
        categories: Object.values(validatedData.channels)
          .flatMap((channel: any) => channel.categories)
          .filter((v, i, a) => a.indexOf(v) === i), // unique categories
        // digestFrequency removed,
        crisisOverride: validatedData.crisis.alwaysNotify,
        escalationChain: {
          escalationChain: validatedData.crisis.escalationChain
        },
        updatedAt: new Date()
      },
      create: {
        userId: user.id ,
        
        categories: Object.values(validatedData.channels)
          .flatMap((channel: any) => channel.categories)
          .filter((v, i, a) => a.indexOf(v) === i),
        // digestFrequency removed,
        crisisOverride: validatedData.crisis.alwaysNotify,
        escalationChain: {
          escalationChain: validatedData.crisis.escalationChain
        }
      }
    });

    return NextResponse.json({
      success: true,
      preferences: {
        id: preferences.id,
        updatedAt: preferences.updatedAt
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' }, { status: 500 });
  }
}