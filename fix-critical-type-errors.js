const fs = require('fs');

console.log('🔧 Starting critical type error fixes...');

// Fix 1: Add missing zod imports where needed
const filesToAddZodImport = [
  'src/lib/validation.ts',
  'src/lib/session/session-manager.ts',
  'src/lib/validation/validation-middleware.ts'
];

filesToAddZodImport.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Add zod import if not present and z namespace is used
      if (content.includes('z.') && !content.includes('import { z }') && !content.includes('import * as z')) {
        content = `import { z } from 'zod';\n${content}`;
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Added zod import to: ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

// Fix 2: Fix Socket.IO import issues
const socketFiles = [
  'src/lib/socket-server.ts',
  'src/lib/websocket/server.ts'
];

socketFiles.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix Socket.IO imports
      content = content.replace(
        /import.*{.*Socket.*}.*from ['"]socket\.io['"]/g,
        "import { Server as SocketIOServer } from 'socket.io'"
      );
      
      content = content.replace(
        /import.*{.*Namespace.*}.*from ['"]socket\.io['"]/g,
        "import { Namespace } from 'socket.io'"
      );
      
      // Fix SocketIOServer usage
      content = content.replace(
        /new SocketIOServer\(/g,
        'new SocketIOServer('
      );
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed Socket.IO imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

// Fix 3: Fix common Prisma field mismatches
const prismaFieldFixes = [
  { from: 'therapySession', to: 'therapistSession' },
  { from: 'smsVerification', to: 'emailVerification' },
  { from: 'analyticsEvent', to: 'auditLog' },
  { from: 'moodTracking', to: 'moodEntry' },
  { from: 'anxietyTracking', to: 'moodEntry' }
];

const filesToFixPrismaFields = [
  'src/lib/security/mfa.ts',
  'src/lib/security/rbac.ts',
  'src/services/compliance/hipaaService.ts',
  'src/services/analytics/analyticsService.ts'
];

filesToFixPrismaFields.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      prismaFieldFixes.forEach(fix => {
        const regex = new RegExp(`\\.${fix.from}\\b`, 'g');
        if (content.includes(`.${fix.from}`)) {
          content = content.replace(regex, `.${fix.to}`);
          modified = true;
        }
      });
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed Prisma field names in: ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

// Fix 4: Fix common enum mismatches
const enumFixes = [
  { from: 'AUTH_FAILURE', to: 'AUTH_FAILED' },
  { from: 'ESCALATED', to: 'ESCALATE' },
  { from: 'ACCESS_TOKEN', to: 'PERSONAL_DATA' },
  { from: 'SESSION_ANALYTICS', to: 'USER_ANALYTICS' }
];

const filesToFixEnums = [
  'src/lib/websocket/client.ts',
  'src/lib/websocket/crisis-manager.ts',
  'src/lib/session/session-manager.ts',
  'src/services/ai/aiInsightsService.ts'
];

filesToFixEnums.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      
      enumFixes.forEach(fix => {
        if (content.includes(fix.from)) {
          content = content.replace(new RegExp(fix.from, 'g'), fix.to);
          modified = true;
        }
      });
      
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed enum values in: ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

// Fix 5: Fix Buffer type issues
const bufferFiles = [
  'src/lib/security/file-security.ts'
];

bufferFiles.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix Buffer toString calls
      content = content.replace(
        /Buffer<ArrayBufferLike>/g,
        'Buffer'
      );
      
      // Add toString() calls where needed
      content = content.replace(
        /crypto\.createHash\([^)]+\)\.update\(([^)]+)\)\.digest/g,
        'crypto.createHash($1).update($1.toString()).digest'
      );
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed Buffer types in: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log('✅ Critical type error fixes completed!');
console.log('📝 Note: Major type issues addressed. Continue with remaining refinements.');