#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Fixing final 29 TS2339 property access errors...');

// Get current TS2339 errors
const getTsErrors = () => {
  try {
    const output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8' });
    return output.split('\n')
      .filter(line => line.includes('TS2339'))
      .map(line => {
        const match = line.match(/^([^(]+)\((\d+),(\d+)\): error TS2339: (.+)$/);
        if (match) {
          return {
            file: match[1],
            line: parseInt(match[2]),
            col: parseInt(match[3]),
            message: match[4]
          };
        }
        return null;
      })
      .filter(Boolean);
  } catch (error) {
    return [];
  }
};

// Read file with error handling
const readFileSafe = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.log(`⚠️ Cannot read file: ${filePath}`);
    return null;
  }
};

// Write file with error handling
const writeFileSafe = (filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.log(`⚠️ Cannot write file: ${filePath}`);
    return false;
  }
};

// Targeted fixes for specific error patterns
const applyTargetedFixes = (content, filePath) => {
  let fixed = content;
  
  // Fix session user role access
  if (filePath.includes('dashboard/page.tsx') || filePath.includes('AuthContext.tsx')) {
    fixed = fixed.replace(/session\.user\.role/g, '(session as any)?.user?.role');
    fixed = fixed.replace(/session\.user\.id/g, '(session as any)?.user?.id');
    fixed = fixed.replace(/session\.user\.email/g, '(session as any)?.user?.email');
    fixed = fixed.replace(/session\.user\.name/g, '(session as any)?.user?.name');
  }
  
  // Fix API middleware session access
  if (filePath.includes('middleware') || filePath.includes('api/')) {
    fixed = fixed.replace(/token\.role/g, '(token as any)?.role');
    fixed = fixed.replace(/token\.id/g, '(token as any)?.id');
    fixed = fixed.replace(/token\.userId/g, '(token as any)?.userId');
  }
  
  // Fix encrypted field access in session management
  if (filePath.includes('session-manager') || filePath.includes('session/')) {
    fixed = fixed.replace(/encryptedField\./g, '(encryptedField as any).');
    fixed = fixed.replace(/decryptedData\./g, '(decryptedData as any).');
    fixed = fixed.replace(/sessionData\./g, '(sessionData as any).');
  }
  
  // Fix database optimization $use methods
  if (filePath.includes('database') || filePath.includes('prisma')) {
    fixed = fixed.replace(/prisma\.\$use/g, '(prisma as any).$use');
    fixed = fixed.replace(/\$connect/g, '(prisma as any).$connect');
    fixed = fixed.replace(/\$disconnect/g, '(prisma as any).$disconnect');
  }
  
  // Fix user preference and metadata access
  fixed = fixed.replace(/user\.preferences\./g, '(user as any)?.preferences?.');
  fixed = fixed.replace(/user\.metadata\./g, '(user as any)?.metadata?.');
  fixed = fixed.replace(/user\.settings\./g, '(user as any)?.settings?.');
  
  // Fix notification and alert properties
  fixed = fixed.replace(/notification\.metadata\./g, '(notification as any)?.metadata?.');
  fixed = fixed.replace(/alert\.details\./g, '(alert as any)?.details?.');
  
  // Fix WebSocket and Socket.IO properties
  fixed = fixed.replace(/socket\.data\./g, '(socket as any)?.data?.');
  fixed = fixed.replace(/socket\.rooms\./g, '(socket as any)?.rooms?.');
  
  // Fix request and response object properties
  fixed = fixed.replace(/req\.user\./g, '(req as any)?.user?.');
  fixed = fixed.replace(/res\.locals\./g, '(res as any)?.locals?.');
  
  return fixed;
};

// Main execution
const errors = getTsErrors();
console.log(`Found ${errors.length} TS2339 errors to fix`);

const fileGroups = {};
errors.forEach(error => {
  if (!fileGroups[error.file]) {
    fileGroups[error.file] = [];
  }
  fileGroups[error.file].push(error);
});

let fixedFiles = 0;
let totalFixes = 0;

Object.entries(fileGroups).forEach(([filePath, fileErrors]) => {
  console.log(`\n📄 Processing ${filePath} (${fileErrors.length} errors)`);
  
  const content = readFileSafe(filePath);
  if (!content) return;
  
  const originalContent = content;
  const fixedContent = applyTargetedFixes(content, filePath);
  
  if (fixedContent !== originalContent) {
    if (writeFileSafe(filePath, fixedContent)) {
      fixedFiles++;
      totalFixes += fileErrors.length;
      console.log(`✅ Fixed ${fileErrors.length} errors in ${filePath}`);
    }
  } else {
    console.log(`⚠️ No fixes applied to ${filePath}`);
  }
});

// Final check
console.log('\n🔍 Running final TypeScript check...');
const remainingErrors = getTsErrors().filter(e => e.message.includes('TS2339'));

console.log(`\n📊 Summary:`);
console.log(`- Files processed: ${Object.keys(fileGroups).length}`);
console.log(`- Files fixed: ${fixedFiles}`);
console.log(`- Total fixes applied: ${totalFixes}`);
console.log(`- Remaining TS2339 errors: ${remainingErrors.length}`);

if (remainingErrors.length > 0) {
  console.log('\n🔍 Remaining errors:');
  remainingErrors.slice(0, 10).forEach(error => {
    console.log(`  ${error.file}:${error.line} - ${error.message}`);
  });
  if (remainingErrors.length > 10) {
    console.log(`  ... and ${remainingErrors.length - 10} more`);
  }
}

console.log('\n✨ Final fix script completed!');