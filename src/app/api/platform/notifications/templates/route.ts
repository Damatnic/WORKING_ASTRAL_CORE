import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// GET /api/platform/notifications/templates - Get notification templates
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

    // Only admins and therapists can view templates
    if (!['ADMIN', 'SUPER_ADMIN', 'THERAPIST', 'CRISIS_COUNSELOR'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    
    if (category) {
      where.category = category;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const templates = await prisma.notificationTemplate.findMany({
      where,
      orderBy: { category: 'asc' }
    });

    // Transform templates to match frontend interface
    const transformedTemplates = templates.map(template => ({
      id: template.id,
      name: template.name,
      category: template.category,
      subject: template.subject,
      content: {
        title: template.name,
        message: template.contentTemplate,
        emailTemplate: template.contentTemplate,
        smsTemplate: template.contentTemplate,
        pushTemplate: template.contentTemplate
      },
      triggers: [],
      channels: template.channels,
      priority: template.priority,
      userRoles: [],
      isActive: template.isActive
    }));

    return NextResponse.json(transformedTemplates, { status: 200 });
  } catch (error) {
    console.error('Error fetching notification templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification templates' }, { status: 500 });
  }
}

// POST /api/platform/notifications/templates - Create a notification template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    // Only admins can create templates
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    const templateSchema = z.object({
      name: z.string(),
      category: z.string(),
      subject: z.string(),
      content: z.object({
        title: z.string(),
        message: z.string(),
        emailTemplate: z.string().optional(),
        smsTemplate: z.string().optional(),
        pushTemplate: z.string().optional()
      }),
      triggers: z.array(z.object({
        event: z.string(),
        conditions: z.record(z.any())
      })),
      channels: z.array(z.enum(['in_app', 'email', 'sms', 'push', 'phone_call'])),
      priority: z.enum(['low', 'medium', 'high', 'urgent']),
      userRoles: z.array(z.string()),
      isActive: z.boolean().default(true)
    });

    const validatedData = templateSchema.parse(body);

    const template = await prisma.notificationTemplate.create({
        data: {
          id: generatePrismaCreateFields().id,name: validatedData.name,
        category: validatedData.category,
        subject: validatedData.subject,
        
        contentTemplate: validatedData.content.message || validatedData.content.emailTemplate || '',
        channels: validatedData.channels,
        priority: validatedData.priority,
        variables: validatedData.variables || {},
        isActive: validatedData.isActive
      }
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error creating notification template:', error);
    return NextResponse.json(
      { error: 'Failed to create notification template' }, { status: 500 });
  }
}

// PUT /api/platform/notifications/templates/[id] - Update a notification template
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    // Only admins can update templates
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const body = await request.json();

    const template = await prisma.notificationTemplate.update({
      where: { id: templateId },
      data: {
        name: body.name,
        category: body.category,
        subject: body.subject,
        
        contentTemplate: body.content?.message || body.content?.emailTemplate || '',
        channels: body.channels,
        priority: body.priority,
        variables: body.variables || {},
        isActive: body.isActive,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        updatedAt: template.updatedAt
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating notification template:', error);
    return NextResponse.json(
      { error: 'Failed to update notification template' }, { status: 500 });
  }
}

// DELETE /api/platform/notifications/templates/[id] - Delete a notification template
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    // Only admins can delete templates
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    await prisma.notificationTemplate.delete({
      where: { id: templateId }
    });

    return NextResponse.json({ success: true, message: 'Template deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting notification template:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification template' }, { status: 500 });
  }
}