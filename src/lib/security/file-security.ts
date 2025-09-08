import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// File security configuration
const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
  
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  
  // Audio (for therapy sessions)
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  
  // Video (for therapy sessions)
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const ENCRYPTED_DIR = process.env.ENCRYPTED_DIR || './encrypted';

// File validation
export async function validateFile(
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<{ valid: boolean; error?: string }> {
  // Check file size
  if (file.length > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds maximum limit of 100MB' };
  }

  // Check MIME type
  if (!ALLOWED_FILE_TYPES[mimeType]) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Check file extension
  const ext = path.extname(filename).toLowerCase();
  const allowedExtensions = ALLOWED_FILE_TYPES[mimeType];
  if (!allowedExtensions.includes(ext)) {
    return { valid: false, error: 'File extension does not match MIME type' };
  }

  // Validate file signature (magic numbers)
  const isValidSignature = await validateFileSignature(file, mimeType);
  if (!isValidSignature) {
    return { valid: false, error: 'Invalid file signature' };
  }

  return { valid: true };
}

// Validate file signature (magic numbers)
async function validateFileSignature(file: Buffer, mimeType: string): Promise<boolean> {
  const signatures: { [key: string]: number[][] } = {
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47]],
    'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  };

  const typeSignatures = signatures[mimeType];
  if (!typeSignatures) return true; // Skip validation for types without known signatures

  for (const signature of typeSignatures) {
    let match = true;
    for (let i = 0; i < signature.length; i++) {
      if (file[i] !== signature[i]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }

  return false;
}

// Virus scanning stub (integrate with actual AV service)
export async function scanForVirus(file: Buffer): Promise<{ safe: boolean; threat?: string }> {
  // In production, integrate with:
  // - ClamAV
  // - Windows Defender API
  // - VirusTotal API
  // - AWS/Azure/GCP malware scanning services
  
  // Basic heuristic checks
  const suspiciousPatterns = [
    Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'),
    Buffer.from('<script'),
    Buffer.from('eval('),
    Buffer.from('document.write'),
    Buffer.from('window.location'),
  ];

  for (const pattern of suspiciousPatterns) {
    if (file.includes(pattern)) {
      return { safe: false, threat: 'Suspicious pattern detected' };
    }
  }

  return { safe: true };
}

// File encryption for HIPAA compliance
export class FileEncryption {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32;
  private ivLength = 16;
  private tagLength = 16;
  private saltLength = 64;
  private iterations = 100000;

  // Generate encryption key from password
  private deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, this.iterations, this.keyLength, 'sha256');
  }

  // Encrypt file
  async encryptFile(
    file: Buffer,
    password: string
  ): Promise<{ encrypted: Buffer; metadata: any }> {
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    const key = this.deriveKey(password, salt);

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(file), cipher.final()]);
    const tag = (cipher as any).getAuthTag();

    // Combine salt, iv, tag, and encrypted data
    const combined = Buffer.concat([salt, iv, tag, encrypted]);

    return {
      encrypted: combined,
      metadata: {
        algorithm: this.algorithm,
        saltLength: this.saltLength,
        ivLength: this.ivLength,
        tagLength: this.tagLength,
      },
    };
  }

  // Decrypt file
  async decryptFile(encryptedData: Buffer, password: string): Promise<Buffer> {
    const salt = encryptedData.slice(0, this.saltLength);
    const iv = encryptedData.slice(this.saltLength, this.saltLength + this.ivLength);
    const tag = encryptedData.slice(
      this.saltLength + this.ivLength,
      this.saltLength + this.ivLength + this.tagLength
    );
    const encrypted = encryptedData.slice(this.saltLength + this.ivLength + this.tagLength);

    const key = this.deriveKey(password, salt);
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    (decipher as any).setAuthTag(tag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}

// Secure file storage
export class SecureFileStorage {
  private encryption = new FileEncryption();

  // Store file securely
  async storeFile(
    file: Buffer,
    filename: string,
    userId: string,
    encryptionKey: string
  ): Promise<{ fileId: string; path: string; checksum: string }> {
    // Generate unique file ID
    const fileId = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    
    // Create checksum
    const checksum = createHash('sha256').update(file).digest('hex');
    
    // Encrypt file
    const { encrypted } = await this.encryption.encryptFile(file, encryptionKey);
    
    // Create secure path structure
    const userDir = path.join(ENCRYPTED_DIR, userId.substring(0, 2), userId.substring(2, 4));
    const filePath = path.join(userDir, `${fileId}_${timestamp}.enc`);
    
    // Ensure directory exists
    await fs.mkdir(userDir, { recursive: true });
    
    // Write encrypted file
    await fs.writeFile(filePath, encrypted);
    
    return { fileId, path: filePath, checksum };
  }

  // Retrieve file securely
  async retrieveFile(
    filePath: string,
    encryptionKey: string,
    expectedChecksum?: string
  ): Promise<Buffer> {
    // Read encrypted file
    const encrypted = await fs.readFile(filePath);
    
    // Decrypt file
    const decrypted = await this.encryption.decryptFile(encrypted, encryptionKey);
    
    // Verify checksum if provided
    if (expectedChecksum) {
      const checksum = createHash('sha256').update(decrypted).digest('hex');
      if (checksum !== expectedChecksum) {
        throw new Error('File integrity check failed');
      }
    }
    
    return decrypted;
  }

  // Delete file securely
  async deleteFile(filePath: string): Promise<void> {
    // Overwrite file with random data before deletion (DOD 5220.22-M standard)
    const stats = await fs.stat(filePath);
    const randomData = crypto.randomBytes(stats.size);
    
    // Three-pass overwrite
    for (let i = 0; i < 3; i++) {
      await fs.writeFile(filePath, randomData);
    }
    
    // Delete file
    await fs.unlink(filePath);
  }
}

// File access control
export class FileAccessControl {
  // Check file access permissions
  async checkAccess(
    userId: string,
    fileId: string,
    requiredPermission: 'read' | 'write' | 'delete' | 'share'
  ): Promise<boolean> {
    // This would check against database for:
    // - File ownership
    // - Shared access permissions
    // - Role-based access (therapists, admins)
    // - Time-based access restrictions
    
    // Placeholder - implement with actual database checks
    return true;
  }

  // Generate secure shareable link
  generateShareToken(fileId: string, expiresIn: number = 7 * 24 * 60 * 60 * 1000): string {
    const payload = {
      fileId,
      expires: Date.now() + expiresIn,
      nonce: crypto.randomBytes(16).toString('hex'),
    };
    
    const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', process.env.FILE_SHARE_SECRET || 'default-secret')
      .update(token)
      .digest('base64url');
    
    return `${token}.${signature}`;
  }

  // Verify share token
  verifyShareToken(token: string): { valid: boolean; fileId?: string } {
    try {
      const [payload, signature] = token.split('.');
      
      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', process.env.FILE_SHARE_SECRET || 'default-secret')
        .update(payload)
        .digest('base64url');
      
      if (signature !== expectedSignature) {
        return { valid: false };
      }
      
      // Decode and verify payload
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
      
      if (data.expires < Date.now()) {
        return { valid: false };
      }
      
      return { valid: true, fileId: data.fileId };
    } catch {
      return { valid: false };
    }
  }
}

// Export utilities
export const fileStorage = new SecureFileStorage();
export const accessControl = new FileAccessControl();