import { prisma } from '@/lib/prisma';
import { Parser } from 'json2csv';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import crypto from 'crypto';

export const EXPORT_DIR = process.env.EXPORT_DIR || './exports';
export const EXPORT_EXPIRY_HOURS = 24;

// Export format types
export type ExportFormat = 'json' | 'csv' | 'pdf';
export type ExportType = 'user_data' | 'journal_entries' | 'mood_data' | 'appointments' | 'all';

// Export options interface
export interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  filters?: {
    startDate?: Date;
    endDate?: Date;
    categories?: string[];
  };
  includeAttachments?: boolean;
  encryptData?: boolean;
  password?: string;
}

// Generate export file path
export function generateExportPath(userId: string, format: ExportFormat): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const filename = `export_${userId}_${timestamp}_${random}.${format}`;
  
  return path.join(EXPORT_DIR, userId, filename);
}

// Fetch user data for export
export async function fetchUserDataForExport(
  userId: string,
  type: ExportType,
  filters?: ExportOptions['filters']
): Promise<any> {
  const data: any = {};
  
  const dateFilter = filters?.startDate && filters?.endDate
    ? {
        createdAt: {
          gte: filters.startDate,
          lte: filters.endDate
        }
      }
    : {};
  
  switch (type) {
    case 'user_data':
      data.profile = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          createdAt: true,
          lastActiveAt: true,
          UserProfile: true,
          NotificationPreference: true
        }
      });
      break;
      
    case 'journal_entries':
      data.journalEntries = await prisma.journalEntry.findMany({
        where: {
          userId,
          ...dateFilter
        },
        orderBy: { createdAt: 'desc' }
      });
      break;
      
    case 'mood_data':
      data.moodEntries = await prisma.moodEntry.findMany({
        where: {
          userId,
          ...dateFilter
        },
        orderBy: { createdAt: 'desc' }
      });
      break;
      
    case 'appointments':
      data.appointments = await prisma.appointment.findMany({
        where: {
          userId,
          ...dateFilter
        },
        orderBy: { scheduledAt: 'desc' }
      });
      break;
      
    case 'all':
      // Fetch all user data
      data.profile = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
          createdAt: true,
          lastActiveAt: true,
          UserProfile: true,
          NotificationPreference: true
        }
      });
      
      data.journalEntries = await prisma.journalEntry.findMany({
        where: { userId, ...dateFilter },
        orderBy: { createdAt: 'desc' }
      });
      
      data.moodEntries = await prisma.moodEntry.findMany({
        where: { userId, ...dateFilter },
        orderBy: { createdAt: 'desc' }
      });
      
      data.appointments = await prisma.appointment.findMany({
        where: { userId, ...dateFilter },
        orderBy: { scheduledAt: 'desc' }
      });
      
      data.safetyPlans = await prisma.safetyPlan.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      
      data.supportSessions = await prisma.supportSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      break;
  }
  
  return data;
}

// Export to JSON format
export async function exportToJSON(
  data: any,
  outputPath: string,
  options?: { pretty?: boolean; encrypt?: boolean; password?: string }
): Promise<void> {
  let jsonString = options?.pretty
    ? JSON.stringify(data, null, 2)
    : JSON.stringify(data);
  
  // Encrypt if requested
  if (options?.encrypt && options?.password) {
    const cipher = crypto.createCipher('aes-256-cbc', options.password);
    jsonString = cipher.update(jsonString, 'utf8', 'hex') + cipher.final('hex');
  }
  
  await fs.writeFile(outputPath, jsonString, 'utf8');
}

// Export to CSV format
export async function exportToCSV(
  data: any,
  outputPath: string,
  options?: { fields?: string[] }
): Promise<void> {
  // Flatten nested data for CSV export
  const flattenedData = flattenData(data);
  
  if (!Array.isArray(flattenedData) || flattenedData.length === 0) {
    throw new Error('No data to export to CSV');
  }
  
  const parser = new Parser({
    fields: options?.fields,
    defaultValue: ''
  });
  
  const csv = parser.parse(flattenedData);
  await fs.writeFile(outputPath, csv, 'utf8');
}

// Export to PDF format
export async function exportToPDF(
  data: any,
  outputPath: string,
  options?: { title?: string; author?: string }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = createWriteStream(outputPath);
    
    doc.pipe(stream);
    
    // Add metadata
    doc.info['Title'] = options?.title || 'Data Export';
    doc.info['Author'] = options?.author || 'Mental Health Platform';
    doc.info['CreationDate'] = new Date();
    
    // Add content
    doc.fontSize(20).text('Data Export', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
    doc.moveDown(2);
    
    // Format and add data sections
    formatDataForPDF(doc, data);
    
    doc.end();
    
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// Helper function to format data for PDF
function formatDataForPDF(doc: any, data: any, indent: number = 0): void {
  const indentStr = '  '.repeat(indent);
  
  if (typeof data === 'object' && data !== null) {
    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        doc.fontSize(10).text(`${indentStr}[${index}]:`);
        formatDataForPDF(doc, item, indent + 1);
      });
    } else {
      for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) continue;
        
        if (typeof value === 'object') {
          doc.fontSize(11).text(`${indentStr}${key}:`, {
            underline: indent === 0
          });
          formatDataForPDF(doc, value, indent + 1);
        } else {
          doc.fontSize(10).text(`${indentStr}${key}: ${value}`);
        }
        
        if (indent === 0) doc.moveDown();
      }
    }
  } else {
    doc.fontSize(10).text(`${indentStr}${data}`);
  }
}

// Flatten nested data for CSV export
function flattenData(data: any): any[] {
  const result: any[] = [];
  
  function flatten(obj: any, prefix: string = ''): any {
    const flat: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}_${key}` : key;
      
      if (value === null || value === undefined) {
        flat[newKey] = '';
      } else if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flat, flatten(value, newKey));
      } else if (Array.isArray(value)) {
        flat[newKey] = JSON.stringify(value);
      } else {
        flat[newKey] = value;
      }
    }
    
    return flat;
  }
  
  // Handle different data structures
  if (Array.isArray(data)) {
    return data.map(item => flatten(item));
  } else if (typeof data === 'object') {
    // If data has arrays as values, flatten each array
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        value.forEach(item => {
          result.push(flatten({ ...item, _type: key }));
        });
      } else if (typeof value === 'object' && value !== null) {
        result.push(flatten({ ...value, _type: key }));
      }
    }
  }
  
  return result.length > 0 ? result : [flatten(data)];
}

// Create export job
export async function createExportJob(
  userId: string,
  options: ExportOptions
): Promise<string> {
  const job = await prisma.exportJob.create({
    data: {
      userId,
      type: options.type,
      format: options.format,
      filters: options.filters as any,
      options: {
        includeAttachments: options.includeAttachments,
        encryptData: options.encryptData
      },
      status: 'pending',
      expiresAt: new Date(Date.now() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000)
    }
  });
  
  return job.id;
}

// Process export job
export async function processExportJob(jobId: string): Promise<void> {
  const job = await prisma.exportJob.findUnique({
    where: { id: jobId }
  });
  
  if (!job) {
    throw new Error('Export job not found');
  }
  
  try {
    // Update job status
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'processing',
        startedAt: new Date(),
        progress: 10
      }
    });
    
    // Fetch data
    const data = await fetchUserDataForExport(
      job.userId,
      job.type as ExportType,
      job.filters as any
    );
    
    // Update progress
    await prisma.exportJob.update({
      where: { id: jobId },
      data: { progress: 50 }
    });
    
    // Generate export file
    const outputPath = generateExportPath(job.userId, job.format as ExportFormat);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    
    // Export based on format
    switch (job.format) {
      case 'json':
        await exportToJSON(data, outputPath, {
          pretty: true,
          encrypt: (job.options as any)?.encryptData,
          password: (job.options as any)?.password
        });
        break;
        
      case 'csv':
        await exportToCSV(data, outputPath);
        break;
        
      case 'pdf':
        await exportToPDF(data, outputPath, {
          title: `Data Export - ${job.type}`,
          author: job.userId
        });
        break;
        
      default:
        throw new Error(`Unsupported format: ${job.format}`);
    }
    
    // Get file size
    const stats = await fs.stat(outputPath);
    
    // Generate download URL
    const downloadToken = crypto.randomBytes(32).toString('hex');
    const downloadUrl = `/api/export/download/${jobId}?token=${downloadToken}`;
    
    // Update job with completion info
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        progress: 100,
        filePath: outputPath,
        fileSize: stats.size,
        downloadUrl,
        completedAt: new Date()
      }
    });
  } catch (error) {
    // Update job with error
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    
    throw error;
  }
}

// Clean up expired exports
export async function cleanupExpiredExports(): Promise<number> {
  const now = new Date();
  
  // Find expired export jobs
  const expiredJobs = await prisma.exportJob.findMany({
    where: {
      expiresAt: { lte: now },
      status: 'completed'
    }
  });
  
  let deletedCount = 0;
  
  for (const job of expiredJobs) {
    try {
      // Delete file if exists
      if (job.filePath) {
        await fs.unlink(job.filePath).catch(() => {});
      }
      
      // Delete job record
      await prisma.exportJob.delete({
        where: { id: job.id }
      });
      
      deletedCount++;
    } catch (error) {
      console.error(`Failed to clean up export job ${job.id}:`, error);
    }
  }
  
  return deletedCount;
}

// Create archive with multiple files
export async function createArchive(
  files: Array<{ path: string; name: string }>,
  outputPath: string,
  format: 'zip' | 'tar' = 'zip'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver(format, {
      zlib: { level: 9 }
    });
    
    output.on('close', resolve);
    archive.on('error', reject);
    
    archive.pipe(output);
    
    for (const file of files) {
      archive.file(file.path, { name: file.name });
    }
    
    archive.finalize();
  });
}

// Validate export job access
export async function validateExportAccess(
  jobId: string,
  userId: string,
  token?: string
): Promise<boolean> {
  const job = await prisma.exportJob.findUnique({
    where: { id: jobId }
  });
  
  if (!job) return false;
  
  // Check if job belongs to user
  if (job.userId !== userId) return false;
  
  // Check if job is completed
  if (job.status !== 'completed') return false;
  
  // Check if job is not expired
  if (job.expiresAt && job.expiresAt < new Date()) return false;
  
  // Additional token validation could be implemented here
  
  return true;
}