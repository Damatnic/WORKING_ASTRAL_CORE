import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { FileQuota } from '@prisma/client';

// File validation and security constants
export const ALLOWED_MIME_TYPES = {
  // Documents
  'application/pdf': { ext: '.pdf', category: 'document' },
  'application/msword': { ext: '.doc', category: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', category: 'document' },
  'text/plain': { ext: '.txt', category: 'document' },
  'application/rtf': { ext: '.rtf', category: 'document' },
  
  // Images
  'image/jpeg': { ext: '.jpg', category: 'image' },
  'image/png': { ext: '.png', category: 'image' },
  'image/gif': { ext: '.gif', category: 'image' },
  'image/webp': { ext: '.webp', category: 'image' },
  'image/svg+xml': { ext: '.svg', category: 'image' },
  
  // Audio
  'audio/mpeg': { ext: '.mp3', category: 'audio' },
  'audio/wav': { ext: '.wav', category: 'audio' },
  'audio/ogg': { ext: '.ogg', category: 'audio' },
  'audio/webm': { ext: '.weba', category: 'audio' },
  
  // Video
  'video/mp4': { ext: '.mp4', category: 'video' },
  'video/webm': { ext: '.webm', category: 'video' },
  'video/ogg': { ext: '.ogv', category: 'video' },
};

export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_STORAGE_PER_USER = 5 * 1024 * 1024 * 1024; // 5GB
export const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
export const TEMP_DIR = process.env.TEMP_DIR || './tmp';

// File path security helpers
export function sanitizeFileName(filename: string): string {
  // Remove path traversal attempts and special characters
  return filename
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255);
}

export function generateSecureFilePath(userId: string, filename: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const sanitized = sanitizeFileName(filename);
  const uniqueId = crypto.randomBytes(16).toString('hex');
  
  return path.join(
    UPLOAD_DIR,
    userId,
    year.toString(),
    month,
    `${uniqueId}_${sanitized}`
  );
}

// File checksum generation
export async function generateFileChecksum(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  const stream = createReadStream(filePath);
  
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  
  return hash.digest('hex');
}

// Virus scanning (integrate with ClamAV or similar)
export async function scanFileForVirus(filePath: string): Promise<{
  status: 'clean' | 'infected' | 'error';
  details?: string;
}> {
  try {
    // TODO: Integrate with actual virus scanning service
    // For now, implement basic checks
    const stats = await fs.stat(filePath);
    
    // Check for suspicious file patterns
    const content = await fs.readFile(filePath, { encoding: 'utf8', flag: 'r' });
    const suspiciousPatterns = [
      /<script[^>]*>/gi,
      /eval\s*\(/gi,
      /document\.write/gi,
      /\.exe/gi,
      /\.bat/gi,
      /\.cmd/gi,
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        return {
          status: 'infected',
          details: 'Suspicious content detected'
        };
      }
    }
    
    return { status: 'clean' };
  } catch (error) {
    console.error('Virus scan error:', error);
    return {
      status: 'error',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// File encryption/decryption
export class FileEncryption {
  private algorithm = 'aes-256-gcm';
  
  generateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  async encryptFile(inputPath: string, outputPath: string, key: string): Promise<{
    iv: string;
    authTag: string;
  }> {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(key, 'hex'), iv);
    
    const input = createReadStream(inputPath);
    const output = createWriteStream(outputPath);
    
    await pipeline(input, cipher, output);
    
    return {
      iv: iv.toString('hex'),
      authTag: (cipher as any).getAuthTag().toString('hex')
    };
  }
  
  async decryptFile(inputPath: string, outputPath: string, key: string, iv: string, authTag: string): Promise<void> {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(key, 'hex'),
      Buffer.from(iv, 'hex')
    );
    
    (decipher as any).setAuthTag(Buffer.from(authTag, 'hex'));
    
    const input = createReadStream(inputPath);
    const output = createWriteStream(outputPath);
    
    await pipeline(input, decipher, output);
  }
}

// Thumbnail generation for images
export async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  width: number = 200,
  height: number = 200
): Promise<void> {
  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    throw error;
  }
}

// File quota management
export async function checkUserQuota(userId: string, fileSize: number): Promise<{
  allowed: boolean;
  currentUsage: bigint;
  maxStorage: bigint;
  remainingStorage: bigint;
}> {
  let quota = await prisma.fileQuota.findUnique({
    where: { userId }
  });
  
  if (!quota) {
    // Create default quota for new user
    quota = await prisma.fileQuota.create({
      data: {
        userId,
        maxStorage: BigInt(MAX_STORAGE_PER_USER),
        usedStorage: BigInt(0),
        maxFileSize: BigInt(MAX_FILE_SIZE),
        maxFiles: 1000,
        fileCount: 0
      }
    });
  }
  
  const newUsage = quota.usedStorage + BigInt(fileSize);
  const remainingStorage = quota.maxStorage - quota.usedStorage;
  
  return {
    allowed: newUsage <= quota.maxStorage && BigInt(fileSize) <= quota.maxFileSize,
    currentUsage: quota.usedStorage,
    maxStorage: quota.maxStorage,
    remainingStorage: remainingStorage > 0 ? remainingStorage : BigInt(0)
  };
}

export async function updateUserQuota(
  userId: string,
  fileSize: number,
  operation: 'add' | 'remove'
): Promise<FileQuota> {
  const quota = await prisma.fileQuota.findUnique({
    where: { userId }
  });
  
  if (!quota) {
    throw new Error('User quota not found');
  }
  
  const sizeChange = BigInt(fileSize);
  const newUsedStorage = operation === 'add' 
    ? quota.usedStorage + sizeChange
    : quota.usedStorage - sizeChange;
  
  const newFileCount = operation === 'add'
    ? quota.fileCount + 1
    : quota.fileCount - 1;
  
  return await prisma.fileQuota.update({
    where: { userId },
    data: {
      usedStorage: newUsedStorage < 0 ? BigInt(0) : newUsedStorage,
      fileCount: newFileCount < 0 ? 0 : newFileCount,
      lastCalculated: new Date()
    }
  });
}

// File access permission checking
export async function checkFileAccess(
  fileId: string,
  userId: string,
  requiredPermission: 'view' | 'download' | 'edit' | 'delete'
): Promise<boolean> {
  // Check if user owns the file
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: {
      FileShares: {
        where: { sharedWithId: userId }
      }
    }
  });
  
  if (!file) return false;
  
  // Owner has all permissions
  if (file.userId === userId) return true;
  
  // Check if file is public and permission is view/download
  if (file.isPublic && ['view', 'download'].includes(requiredPermission)) {
    return true;
  }
  
  // Check shared permissions
  const share = file.FileShares[0];
  if (!share) return false;
  
  const permissionHierarchy = {
    view: 1,
    download: 2,
    edit: 3,
    delete: 4
  };
  
  const sharePermissionLevel = permissionHierarchy[share.permission as keyof typeof permissionHierarchy] || 0;
  const requiredPermissionLevel = permissionHierarchy[requiredPermission];
  
  return sharePermissionLevel >= requiredPermissionLevel;
}

// Audit logging for file operations
export async function logFileAccess(
  fileId: string,
  userId: string | null,
  action: string,
  success: boolean,
  errorMsg?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await prisma.fileAccessLog.create({
    data: {
      fileId,
      userId,
      action,
      success,
      errorMsg,
      ipAddress,
      userAgent
    }
  });
}

// File cleanup for expired files
export async function cleanupExpiredFiles(): Promise<number> {
  const now = new Date();
  
  // Find expired files
  const expiredFiles = await prisma.file.findMany({
    where: {
      expiresAt: {
        lte: now
      }
    }
  });
  
  let deletedCount = 0;
  
  for (const file of expiredFiles) {
    try {
      // Delete physical file
      await fs.unlink(file.path);
      
      // Delete thumbnail if exists
      if (file.thumbnailPath) {
        await fs.unlink(file.thumbnailPath).catch(() => {});
      }
      
      // Delete database record (cascade will handle related records)
      await prisma.file.delete({
        where: { id: file.id }
      });
      
      // Update user quota
      await updateUserQuota(file.userId, file.size, 'remove');
      
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete expired file ${file.id}:`, error);
    }
  }
  
  return deletedCount;
}

// File validation helpers
export function validateMimeType(mimeType: string): boolean {
  return mimeType in ALLOWED_MIME_TYPES;
}

export function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

export function getFileCategory(mimeType: string): string {
  const typeInfo = ALLOWED_MIME_TYPES[mimeType];
  return typeInfo ? typeInfo.category : 'other';
}

export function getFileExtension(mimeType: string): string {
  const typeInfo = ALLOWED_MIME_TYPES[mimeType];
  return typeInfo ? typeInfo.ext : '';
}

// Secure file URL generation
export function generateSecureFileUrl(fileId: string, expiresIn: number = 3600): string {
  const timestamp = Date.now() + (expiresIn * 1000);
  const data = `${fileId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', process.env.FILE_URL_SECRET || 'default-secret')
    .update(data)
    .digest('hex');
  
  return `/api/files/${fileId}?expires=${timestamp}&signature=${signature}`;
}

export function validateSecureFileUrl(fileId: string, expires: string, signature: string): boolean {
  const now = Date.now();
  const expiryTime = parseInt(expires, 10);
  
  if (now > expiryTime) return false;
  
  const data = `${fileId}:${expires}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.FILE_URL_SECRET || 'default-secret')
    .update(data)
    .digest('hex');
  
  return signature === expectedSignature;
}