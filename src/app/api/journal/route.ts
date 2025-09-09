import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { CreateJournalEntryRequest, JournalEntry } from '@/types/wellness';
import crypto from 'crypto';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

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

// Analyze sentiment (placeholder - would use AI in production)
function analyzeSentiment(text: string): number {
  const positiveWords = ['happy', 'good', 'great', 'wonderful', 'amazing', 'love', 'joy', 'excited'];
  const negativeWords = ['sad', 'bad', 'terrible', 'awful', 'hate', 'angry', 'depressed', 'anxious'];
  
  const lowerText = text.toLowerCase();
  let score = 0;
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) score += 0.1;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) score -= 0.1;
  });
  
  return Math.max(-1, Math.min(1, score));
}

// GET /api/journal - Fetch journal entries
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search');

    // Fetch journal entries
    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.journalEntry.count({ where: { userId: user.id } })
    ]);

    // Decrypt and format entries
    const formattedEntries: JournalEntry[] = entries.map(entry => {
      let title = '';
      let content = '';
      let tags: string[] = [];

      // Decrypt title
      if (entry.encryptedTitle) {
        title = decrypt(entry.encryptedTitle);
      }

      // Decrypt content
      if (entry.encryptedContent) {
        content = decrypt(entry.encryptedContent);
      }

      // Decrypt tags
      if (entry.encryptedTags) {
        try {
          const decryptedTags = decrypt(entry.encryptedTags as string);
          tags = JSON.parse(decryptedTags);
        } catch (e) {
          tags = [];
        }
      }

      // Filter by search if provided
      if (search) {
        const searchLower = search.toLowerCase();
        if (!title.toLowerCase().includes(searchLower) && 
            !content.toLowerCase().includes(searchLower) &&
            !tags.some(tag => tag.toLowerCase().includes(searchLower))) {
          return null;
        }
      }

      return {
        id: entry.id,
        userId: entry.userId,
        title,
        content,
        tags,
        isPrivate: entry.isPrivate,
        sentiment: entry.sentiment,
        createdAt: entry.createdAt.toISOString(),
        updatedAt: entry.updatedAt.toISOString()
      };
    }).filter(Boolean) as JournalEntry[];

    return NextResponse.json({
      success: true,
      data: formattedEntries,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
      hasMore: offset + limit < total
    });

  } catch (error) {
    console.error('Fetch journal entries error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch journal entries' },
      { status: 500 }
    );
  }
}

// POST /api/journal - Create new journal entry
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

    const body: CreateJournalEntryRequest = await request.json();

    // Validate required fields
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    // Encrypt data
    const encryptedTitle = body.title ? encrypt(body.title) : null;
    const encryptedContent = encrypt(body.content);
    const encryptedTags = body.tags && body.tags.length > 0 
      ? encrypt(JSON.stringify(body.tags)) 
      : null;

    // Analyze sentiment
    const sentiment = analyzeSentiment(body.content);

    // Create journal entry
    const entry = await prisma.journalEntry.create({
        data: {
          id: crypto.randomUUID(),
        userId: user.id,
        encryptedTitle,
        encryptedContent,
        encryptedTags: encryptedTags as any,
        isPrivate: body.isPrivate !== false,
        sentiment,
        updatedAt: new Date()
      }
    });

    // Update user's last activity
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });

    // Format response
    const response: JournalEntry = {
      id: entry.id,
      userId: entry.userId,
      title: body.title,
      content: body.content,
      tags: body.tags,
      mood: body.mood,
      isPrivate: entry.isPrivate,
      sentiment: entry.sentiment,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: response,
      message: 'Journal entry saved successfully'
    });

  } catch (error) {
    console.error('Create journal entry error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save journal entry' },
      { status: 500 }
    );
  }
}

// PUT /api/journal - Update journal entry
export async function PUT(request: NextRequest) {
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

    // Verify ownership
    const existingEntry = await prisma.journalEntry.findFirst({
      where: {
        id: entryId,
        userId: user.id
      }
    });

    if (!existingEntry) {
      return NextResponse.json(
        { success: false, error: 'Entry not found or unauthorized' },
        { status: 404 }
      );
    }

    const body: Partial<CreateJournalEntryRequest> = await request.json();

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (body.title !== undefined) {
      updateData.encryptedTitle = body.title ? encrypt(body.title) : null;
    }

    if (body.content !== undefined) {
      updateData.encryptedContent = encrypt(body.content);
      updateData.sentiment = analyzeSentiment(body.content);
    }

    if (body.tags !== undefined) {
      updateData.encryptedTags = body.tags && body.tags.length > 0 
        ? encrypt(JSON.stringify(body.tags)) 
        : null;
    }

    if (body.isPrivate !== undefined) {
      updateData.isPrivate = body.isPrivate;
    }

    // Update entry
    const updatedEntry = await prisma.journalEntry.update({
      where: { id: entryId },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      message: 'Journal entry updated successfully'
    });

  } catch (error) {
    console.error('Update journal entry error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update journal entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/journal - Delete journal entry
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
    const entry = await prisma.journalEntry.findFirst({
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

    await prisma.journalEntry.delete({
      where: { id: entryId }
    });

    return NextResponse.json({
      success: true,
      message: 'Journal entry deleted successfully'
    });

  } catch (error) {
    console.error('Delete journal entry error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete journal entry' },
      { status: 500 }
    );
  }
}