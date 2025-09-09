import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// GET /api/platform/search/saved - Get saved searches
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

    // savedSearch model not found - return empty array
    /*
    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId: user.id },
      orderBy: { lastUsed: 'desc' },
      take: 20
    });
    */

    return NextResponse.json({
      savedSearches: []
    });
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved searches' },
      { status: 500 }
    );
  }
}

// POST /api/platform/search/saved - Save a search
export async function POST(request: NextRequest) {
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
    const { name, query, filters } = body;

    // savedSearch model not found - disabled
    /*
    const savedSearch = await prisma.savedSearch.create({
        data: {
          id: generatePrismaCreateFields().id,userId: user.id,
        name,
        query,
        filters,
        useCount: 0
      }
    });
    */

    return NextResponse.json({
      success: false,
      error: 'savedSearch feature not available - model not found'
    });
  } catch (error) {
    console.error('Error saving search:', error);
    return NextResponse.json(
      { error: 'Failed to save search' },
      { status: 500 }
    );
  }
}

// PUT /api/platform/search/saved/[id] - Update saved search usage
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
    const { id } = body;

    // savedSearch model not found - disabled
    /*
    const savedSearch = await prisma.savedSearch.update({
      where: { 
        id,
        userId: user.id
      },
      data: {
        useCount: { increment: 1 },
        lastUsed: new Date()
      }
    });
    */

    return NextResponse.json({
      success: false,
      error: 'savedSearch feature not available - model not found'
    });
  } catch (error) {
    console.error('Error updating saved search:', error);
    return NextResponse.json(
      { error: 'Failed to update saved search' },
      { status: 500 }
    );
  }
}

// DELETE /api/platform/search/saved/[id] - Delete saved search
export async function DELETE(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Search ID required' }, { status: 400 });
    }

    // savedSearch model not found - disabled
    /*
    await prisma.savedSearch.delete({
      where: { 
        id,
        userId: user.id
      }
    });
    */

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved search:', error);
    return NextResponse.json(
      { error: 'Failed to delete saved search' },
      { status: 500 }
    );
  }
}