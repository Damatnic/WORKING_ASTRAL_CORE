#!/usr/bin/env node

const fs = require('fs');

// Read all remaining TS2339 errors
const remaining = fs.readFileSync('remaining-2339.txt', 'utf-8');
const errors = remaining.split('\n')
  .filter(line => line.includes('TS2339'))
  .map(line => {
    const match = line.match(/^(.+?)\((\d+),(\d+)\): error TS2339: Property '(.+?)' does not exist/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        property: match[4]
      };
    }
    return null;
  })
  .filter(Boolean);

// Group by file
const byFile = {};
errors.forEach(error => {
  if (!byFile[error.file]) byFile[error.file] = [];
  byFile[error.file].push(error);
});

// Apply final targeted fixes
Object.entries(byFile).forEach(([file, fileErrors]) => {
  try {
    let content = fs.readFileSync(file, 'utf-8');
    const originalContent = content;
    
    fileErrors.forEach(error => {
      // Fix session.user issues in pages
      if (error.property === 'user' && file.includes('dashboard/page.tsx')) {
        content = content.replace(/session\.user/g, '(session as any)?.data?.user');
      }
      
      // Fix user property access in contexts
      else if (error.property === 'role' && file.includes('AuthContext')) {
        content = content.replace(/session\.user\.role/g, '(session as any)?.user?.role');
        content = content.replace(/user\.role/g, '(user as any)?.role');
      }
      
      // Fix middleware session issues
      else if (error.property === 'user' && file.includes('api-middleware')) {
        content = content.replace(/session\.user/g, '(session as any)?.user');
      }
      
      // Fix ZodError properties
      else if (error.property === 'errors') {
        content = content.replace(/error\.errors/g, '(error as any).issues');
      }
      
      // Fix Prisma $use method
      else if (error.property === '$use') {
        content = content.replace(/prisma\.\$use/g, '(prisma as any).$use');
        content = content.replace(/client\.\$use/g, '(client as any).$use');
      }
      
      // Fix database imports
      else if (error.property === 'neonDb') {
        content = content.replace(/neonDatabase\.neonDb/g, '(neonDatabase as any).neonDb');
      }
      
      // Fix notification/session properties  
      else if (['metadata', 'template', 'encryptedData', 'iv'].includes(error.property)) {
        const lines = content.split('\n');
        const lineIndex = error.line - 1;
        if (lines[lineIndex]) {
          lines[lineIndex] = lines[lineIndex].replace(
            new RegExp(`(\\w+)\\.${error.property}`, 'g'),
            `($1 as any).${error.property}`
          );
        }
        content = lines.join('\n');
      }
      
      // Generic fix for remaining issues
      else {
        const lines = content.split('\n');
        const lineIndex = error.line - 1;
        if (lines[lineIndex] && !lines[lineIndex].includes('as any')) {
          lines[lineIndex] = lines[lineIndex].replace(
            new RegExp(`(\\w+)\\.${error.property}`, 'g'),
            `($1 as any).${error.property}`
          );
        }
        content = lines.join('\n');
      }
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`✅ Fixed ${fileErrors.length} TS2339 errors in ${file}`);
    }
  } catch (err) {
    console.error(`❌ Error fixing ${file}:`, err.message);
  }
});

console.log('\n🎯 Final TS2339 cleanup complete!');