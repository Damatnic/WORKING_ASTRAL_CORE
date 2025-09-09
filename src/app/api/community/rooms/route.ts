
import { NextRequest, NextResponse } from 'next/server';
import { createSuccessResponse, createApiErrorHandler } from '@/lib/api-error-handler';

export async function GET(req: NextRequest) {
  try {
    const url = (req as any).url || req.nextUrl?.toString();
    const { searchParams } = new URL(url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');

    // Mock rooms data - in production this would come from database
    let rooms = [
      {
        id: 'anxiety-support',
        name: 'Anxiety Support',
        description: 'A safe space to discuss anxiety, share coping strategies, and support each other.',
        category: 'Mental Health',
        members: 456,
        activeNow: 23,
        isPrivate: false,
        isFeatured: true,
        lastActivity: '2 minutes ago',
        moderators: ['therapist_sarah', 'peer_mentor_alex'],
        tags: ['anxiety', 'coping-strategies', 'support'],
        rules: ['Be respectful', 'No medical advice', 'Share experiences thoughtfully']
      },
      {
        id: 'mindfulness',
        name: 'Mindfulness Practice',
        description: 'Daily mindfulness practices, meditation tips, and present-moment awareness.',
        category: 'Mindfulness',
        members: 389,
        activeNow: 18,
        isPrivate: false,
        isFeatured: true,
        lastActivity: '8 minutes ago',
        moderators: ['meditation_guide'],
        tags: ['meditation', 'mindfulness', 'present-moment'],
        rules: ['Respectful sharing only', 'Keep discussions focused', 'No promotions']
      },
      {
        id: 'depression-help',
        name: 'Depression Help',
        description: 'Understanding depression, sharing experiences, and finding hope together.',
        category: 'Mental Health',
        members: 334,
        activeNow: 15,
        isPrivate: false,
        isFeatured: false,
        lastActivity: '15 minutes ago',
        moderators: ['counselor_mike'],
        tags: ['depression', 'hope', 'recovery'],
        rules: ['No triggers without warnings', 'Supportive language only', 'Respect privacy']
      },
      {
        id: 'general',
        name: 'General Wellness',
        description: 'Overall wellness discussions, lifestyle tips, and general support.',
        category: 'General',
        members: 523,
        activeNow: 31,
        isPrivate: false,
        isFeatured: true,
        lastActivity: '1 minute ago',
        moderators: ['wellness_coach'],
        tags: ['wellness', 'lifestyle', 'general'],
        rules: ['Stay on topic', 'Be encouraging', 'No spam or promotions']
      },
      {
        id: 'sleep-better',
        name: 'Sleep Better',
        description: 'Sleep hygiene tips, insomnia support, and healthy sleep habits.',
        category: 'Physical Health',
        members: 198,
        activeNow: 7,
        isPrivate: false,
        isFeatured: false,
        lastActivity: '32 minutes ago',
        moderators: ['sleep_specialist'],
        tags: ['sleep', 'insomnia', 'rest'],
        rules: ['Share helpful tips', 'No medical diagnoses', 'Respect different schedules']
      },
      {
        id: 'creative-therapy',
        name: 'Creative Therapy',
        description: 'Art, music, writing, and other creative outlets for healing and expression.',
        category: 'Creative',
        members: 267,
        activeNow: 12,
        isPrivate: false,
        isFeatured: false,
        lastActivity: '18 minutes ago',
        moderators: ['art_therapist_jenny'],
        tags: ['creativity', 'art-therapy', 'expression'],
        rules: ['Share your creativity', 'Constructive feedback only', 'Respect all art forms']
      }
    ];

    // Filter by category if requested
    if (category && category !== 'all') {
      rooms = rooms.filter(room => room.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by featured if requested
    if (featured === 'true') {
      rooms = rooms.filter(room => room.isFeatured);
    }

    return createSuccessResponse({
      rooms,
      total: rooms.length,
      categories: ['Mental Health', 'Mindfulness', 'General', 'Physical Health', 'Creative'],
      filters: { category, featured }
    }, {
      cacheControl: 'public, max-age=60'
    });
  } catch (error) {
    console.error('Community rooms error:', error);
    return createApiErrorHandler('ROOMS_ERROR', 'Failed to fetch community rooms', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const roomData = await (req as any).json();
    
    // Mock room creation - in production this would create in database
    const newRoom = {
      id: `room_${Date.now()}`,
      ...roomData,
      members: 1,
      activeNow: 1,
      isPrivate: roomData.isPrivate || false,
      isFeatured: false,
      lastActivity: 'just now',
      moderators: ['current_user'],
      createdAt: new Date().toISOString()
    };
    
    console.log('Creating new room:', newRoom);
    
    return createSuccessResponse(newRoom, { status: 201 });
  } catch (error) {
    console.error('Room creation error:', error);
    return createApiErrorHandler('ROOM_CREATE_ERROR', 'Failed to create room', 500);
  }
}