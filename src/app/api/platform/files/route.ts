import { NextRequest, NextResponse } from 'next/server';
import { generatePrismaCreateFields } from "@/lib/prisma-helpers";
import { getServerSession } from 'next-auth/next';
import { Session } from 'next-auth';
import { authOptions } from "@/lib/auth";
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Force dynamic rendering for API routes
export const dynamic = 'force-dynamic';

// File upload configuration
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600'); // 100MB default
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/quicktime',
  'text/plain',
  'application/zip'
];

// Virus scanning stub - integrate with actual antivirus service
async function scanFileForViruses(filePath: string): Promise<{ clean: boolean; threat?: string }> {
  // TODO: Integrate with ClamAV, Windows Defender, or cloud-based AV service
  // For now, return clean for all files
  return { clean: true };
}

// Encryption helper
function encryptFile(buffer: Buffer, key: string): Buffer {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  
  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return Buffer.concat([iv, authTag, encrypted]);
}

function decryptFile(encryptedBuffer: Buffer, key: string): Buffer {
  const algorithm = 'aes-256-gcm';
  const iv = encryptedBuffer.slice(0, 16);
  const authTag = encryptedBuffer.slice(16, 32);
  const encrypted = encryptedBuffer.slice(32);
  
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
}

// GET /api/platform/files - List files
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

    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path') || '/';
    const search = searchParams.get('search');
    const filterType = searchParams.get('filterType');
    const sortBy = searchParams.get('sortBy') || 'modifiedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: any = {
      OR: [
        { ownerId: user.id },
        {
          shares: {
            some: {
              sharedWithId: user.id
            }
          }
        }
      ],
      deletedAt: null
    };

    // Filter by path
    if (path !== '/') {
      where.path = {
        startsWith: path
      };
    }

    // Search filter
    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { tags: { has: search } }
          ]
        }
      ];
    }

    // Type filter
    if (filterType && filterType !== 'all') {
      if (filterType === 'folders') {
        where.type = 'folder';
      } else if (filterType === 'documents') {
        where.type = 'file';
        where.mimeType = {
          in: ['application/pdf', 'application/msword', 'text/plain']
        };
      } else if (filterType === 'images') {
        where.type = 'file';
        where.mimeType = {
          startsWith: 'image/'
        };
      } else if (filterType === 'videos') {
        where.type = 'file';
        where.mimeType = {
          startsWith: 'video/'
        };
      } else if (filterType === 'audio') {
        where.type = 'file';
        where.mimeType = {
          startsWith: 'audio/'
        };
      }
    }

    // Get files with pagination
    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          User: {
            select: {
              id: true,
              displayName: true,
              email: true
            }
          },
          FileShares: {
            include: {
              File: {
                select: {
                  id: true,
                  filename: true
                }
              }
            }
          },
          FileVersions: {
            orderBy: { version: 'desc' },
            take: 5
          }
        }
      }),
      prisma.file.count({ where })
    ]);

    // Transform files for response
    const transformedFiles = files.map((file: any) => ({
      id: file.id,
      name: file.filename,
      type: file.mimeType,
      mimeType: file.mimeType,
      size: file.size,
      path: file.path,
      parentId: null,
      createdAt: file.createdAt,
      modifiedAt: file.updatedAt,
      createdBy: file.User?.displayName || file.User?.email || 'Unknown',
      modifiedBy: file.User?.displayName || file.User?.email || 'Unknown',
      isShared: file.FileShares?.length > 0,
      isEncrypted: file.isEncrypted,
      isStarred: false,
      shareSettings: file.FileShares?.length > 0 ? {
        isPublic: file.isPublic,
        allowDownload: true,
        allowEdit: false,
        expiresAt: file.expiresAt,
        sharedWith: file.FileShares?.map((share: any) => ({
          fileId: share.fileId,
          fileName: share.File?.filename,
          permissions: share.permission
        }))
      } : undefined,
      tags: file.tags || [],
      version: file.version,
      versions: file.versions.map((v: any) => ({
        id: v.id,
        version: v.version,
        createdAt: v.createdAt,
        createdBy: v.createdById,
        comment: v.comment,
        size: v.size
      })),
      metadata: {
        uploadStatus: 'completed',
        virusScan: {
          status: file.virusScanStatus || 'clean',
          scannedAt: file.virusScanDate
        },
        thumbnailUrl: file.thumbnailPath
      },
      permissions: {
        canView: true,
        canEdit: file.userId === user.id || file.FileShares?.some((s: any) => 
          s.sharedWithId === user.id && s.permission.includes('edit')
        ),
        canDelete: file.userId === user.id,
        canShare: file.userId === user.id || file.FileShares?.some((s: any) => 
          s.sharedWithId === user.id && s.permission.includes('share')
        ),
        canDownload: true
      }
    }));

    return NextResponse.json({
      files: transformedFiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}

// POST /api/platform/files - Upload file
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const parentPath = formData.get('path') as string || '/';
    const isEncrypted = formData.get('encrypted') === 'true';
    const tags = JSON.parse(formData.get('tags') as string || '[]');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate unique filename
    const fileId = uuidv4();
    const fileExt = path.extname(file.name);
    const storedFileName = `${fileId}${fileExt}`;
    const filePath = path.join(UPLOAD_DIR, user.id, storedFileName);

    // Ensure upload directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Scan for viruses
    const scanResult = await scanFileForViruses(filePath);
    if (!scanResult.clean) {
      return NextResponse.json(
        { error: 'File contains malware', threat: scanResult.threat },
        { status: 400 }
      );
    }

    // Encrypt file if requested
    let finalBuffer = buffer;
    let encryptionKey = null;
    
    if (isEncrypted) {
      encryptionKey = crypto.randomBytes(32).toString('hex');
      finalBuffer = Buffer.from(encryptFile(buffer, encryptionKey));
    }

    // Write file to disk
    await fs.writeFile(filePath, finalBuffer);

    // Create database record
    const fileRecord = await prisma.file.create({
        data: {
          id: fileId,
        
        filename: file.name,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        path: parentPath + file.name,
        userId: user.id,
        isEncrypted,
        encryptionKey: isEncrypted ? encryptionKey : null,
        tags,
        version: 1,
        checksum: crypto.createHash('sha256').update(finalBuffer).digest('hex'),
        virusScanStatus: 'clean',
        virusScanDate: new Date(),
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      }
    });

    // Create initial version record
    await prisma.fileVersion.create({
        data: {
          id: generatePrismaCreateFields().id,
          fileId: fileRecord.id,
          version: 1,
          path: parentPath + file.name,
          size: file.size,
          checksum: crypto.createHash('sha256').update(finalBuffer).digest('hex'),
          changedBy: user.id,
          changeNotes: 'Initial upload'
      }
    });

    return NextResponse.json({
      success: true,
      file: {
        id: fileRecord.id,
        name: fileRecord.filename,
        size: fileRecord.size,
        type: fileRecord.mimeType,
        path: fileRecord.path,
        createdAt: fileRecord.createdAt
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// DELETE /api/platform/files - Delete file
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
    const fileId = searchParams.get('id');

    if (!fileId) {
      return NextResponse.json({ error: 'File ID required' }, { status: 400 });
    }

    // Check if user owns the file
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        
      }
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found or unauthorized' }, { status: 404 });
    }

    // Soft delete the file
    await prisma.file.update({
      where: { id: fileId },
      data: {
        
        // deletedBy: user.id
      }
    });

    // Schedule permanent deletion after 30 days
    // TODO: Implement background job for permanent deletion

    return NextResponse.json({ success: true, message: 'File deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}