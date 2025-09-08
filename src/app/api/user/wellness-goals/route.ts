import { NextRequest, NextResponse } from 'next/server';

// @ts-ignore
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ 
      data: [
        { id: '1', title: 'Goal 1', description: 'Description 1' },
        { id: '2', title: 'Goal 2', description: 'Description 2' }
      ] 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to get wellness goals' }, { status: 500 });
  }
}

// @ts-ignore
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ 
      data: { id: 'new-goal', ...body }, 
      message: 'Wellness goal created' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create wellness goal' }, { status: 500 });
  }
}

// @ts-ignore
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ 
      data: { id: body.id || 'updated-goal', ...body }, 
      message: 'Wellness goal updated' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update wellness goal' }, { status: 500 });
  }
}

// @ts-ignore
export async function DELETE(request: NextRequest) {
  try {
    return NextResponse.json({ 
      data: null, 
      message: 'Wellness goal deleted' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete wellness goal' }, { status: 500 });
  }
}