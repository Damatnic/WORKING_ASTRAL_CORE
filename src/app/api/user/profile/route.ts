import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ 
      data: { 
        id: 'user-123', 
        email: 'user@example.com', 
        name: 'User Name',
        profile: {}
      } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ 
      data: { 
        id: 'user-123', 
        ...body 
      }, 
      message: 'Profile updated' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return NextResponse.json({ 
      data: null, 
      message: 'Profile deleted' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}