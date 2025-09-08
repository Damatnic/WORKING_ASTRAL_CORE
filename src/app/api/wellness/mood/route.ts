import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { CreateMoodEntryRequest, MoodEntry } from '@/types/wellness';
import crypto from 'crypto';

// Encryption helper functions
function encrypt(text: string): string {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'utf-8').slice(0, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    encrypted,
    authTag: authTag.toString('hex'),
    iv: iv.toString('hex')
  });
}

function decrypt(encryptedData: string): string {
  try {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-change-in-production', 'utf-8').slice(0, 32);
    const data = JSON.parse(encryptedData);
    
    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return '';
  }
}

// GET /api/wellness/mood - Fetch mood entries
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query conditions
    const where: any = { userId: user.id };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Fetch mood entries
    const [entries, total] = await Promise.all([
      prisma.moodEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.moodEntry.count({ where })
    ]);

    // Decrypt and format entries
    const formattedEntries: MoodEntry[] = entries.map(entry => {
      let notes, triggers, activities;
      
      // Decrypt notes if present
      if (entry.encryptedNotes) {
        try {
          const decryptedData = decrypt(entry.encryptedNotes as string);
          const parsedData = JSON.parse(decryptedData);
          notes = parsedData.notes;
        } catch (e) {
          notes = undefined;
        }
      }

      // Decrypt tags if present (used for triggers and activities)
      if (entry.encryptedTags) {
        try {
          const decryptedData = decrypt(entry.encryptedTags as string);
          const parsedData = JSON.parse(decryptedData);
          triggers = parsedData.triggers || [];
          activities = parsedData.activities || [];
        } catch (e) {
          triggers = [];
          activities = [];
        }
      }

      return {
        id: entry.id,
        userId: entry.userId,
        moodScore: entry.moodScore,
        anxietyLevel: entry.anxietyLevel,
        energyLevel: entry.energyLevel,
        sleepQuality: entry.anxietyLevel, // Using anxietyLevel as placeholder for sleep
        notes,
        triggers,
        activities,
        createdAt: entry.createdAt.toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedEntries,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + limit < total
    });

  } catch (error) {
    console.error('Fetch mood entries error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mood entries' },
      { status: 500 }
    );
  }
}

// POST /api/wellness/mood - Create new mood entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const body: CreateMoodEntryRequest = await request.json();

    // Validate required fields
    if (!body.moodScore || body.moodScore < 1 || body.moodScore > 10) {
      return NextResponse.json(
        { success: false, error: 'Invalid mood score. Must be between 1 and 10.' },
        { status: 400 }
      );
    }

    // Encrypt sensitive data
    let encryptedNotes = null;
    if (body.notes) {
      encryptedNotes = encrypt(JSON.stringify({ notes: body.notes }));
    }

    let encryptedTags = null;
    if (body.triggers || body.activities) {
      encryptedTags = encrypt(JSON.stringify({
        triggers: body.triggers || [],
        activities: body.activities || []
      }));
    }

    // Create mood entry
    const entry = await prisma.moodEntry.create({
        data: {
          id: crypto.randomUUID(),
        userId: user.id,
        moodScore: body.moodScore,
        anxietyLevel: body.anxietyLevel || null,
        energyLevel: body.energyLevel || null,
        encryptedNotes: encryptedNotes as any,
        encryptedTags: encryptedTags as any
      }
    });

    // Update user's last activity
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });

    // Format response
    const response: MoodEntry = {
      id: entry.id,
      userId: entry.userId,
      moodScore: entry.moodScore,
      anxietyLevel: entry.anxietyLevel,
      energyLevel: entry.energyLevel,
      sleepQuality: body.sleepQuality,
      notes: body.notes,
      triggers: body.triggers,
      activities: body.activities,
      createdAt: entry.createdAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: response,
      message: 'Mood entry saved successfully'
    });

  } catch (error) {
    console.error('Create mood entry error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save mood entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/wellness/mood - Delete a mood entry
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('id');

    if (!entryId) {
      return NextResponse.json(
        { success: false, error: 'Entry ID is required' },
        { status: 400 }
      );
    }

    // Verify ownership and delete
    const entry = await prisma.moodEntry.findFirst({
      where: {
        id: entryId,
        userId: user.id
      }
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Entry not found or unauthorized' },
        { status: 404 }
      );
    }

    await prisma.moodEntry.delete({
      where: { id: entryId }
    });

    return NextResponse.json({
      success: true,
      message: 'Mood entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete mood entry error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete mood entry' },
      { status: 500 }
    );
  }
}