#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Final comprehensive TypeScript error fixes...\n');

// Fix NextAuth import
function fixNextAuthImport(content) {
  return content.replace(
    /import\s*{\s*NextAuth\s*}\s*from\s*['"]next-auth['"]/g,
    "import NextAuth from 'next-auth'"
  );
}

// Fix auth-middleware getUserFromRequest calls
function fixGetUserFromRequest(content) {
  return content.replace(
    /const\s+user\s*=\s*await\s+getUserFromRequest\(req\);?/g,
    "const user = req.user!;"
  );
}

// Fix Prisma User connect patterns
function fixPrismaUserConnect(content) {
  let fixed = content;
  
  // Fix patterns like User: { connect: { id: user.id } }
  fixed = fixed.replace(
    /User:\s*{\s*connect:\s*{\s*id:\s*([^}]+)\s*}\s*}/g,
    "userId: $1"
  );
  
  // Fix where clauses with connect
  fixed = fixed.replace(
    /where:\s*{\s*User:\s*{\s*connect:\s*{\s*id:\s*([^}]+)\s*}\s*}\s*}/g,
    "where: { userId: $1 }"
  );
  
  return fixed;
}

// Fix encryptApiField/decryptApiField imports
function fixEncryptionExports(content) {
  let fixed = content;
  
  // For files importing encryptApiField/decryptApiField that don't exist
  if (fixed.includes("import { encryptApiField, decryptApiField }")) {
    fixed = fixed.replace(
      /import\s*{\s*encryptApiField,\s*decryptApiField\s*}\s*from\s*['"]@\/lib\/encryption['"]/g,
      "import { encryptJSON as encryptApiField, decryptJSON as decryptApiField } from '@/lib/encryption'"
    );
  }
  
  return fixed;
}

// Fix decryptJSON/encryptJSON calls with empty object second parameter
function fixEncryptDecryptCalls(content) {
  let fixed = content;
  
  // Fix encryptJSON(data, {})
  fixed = fixed.replace(/encryptJSON\(([^,)]+),\s*{}\)/g, 'encryptJSON($1)');
  
  // Fix decryptJSON(data, {})
  fixed = fixed.replace(/decryptJSON\(([^,)]+),\s*{}\)/g, 'decryptJSON($1)');
  
  return fixed;
}

// Fix duplicate object properties
function fixDuplicateProperties(content) {
  let fixed = content;
  
  // Fix duplicate mimeType in platform/files
  fixed = fixed.replace(
    /mimeType:\s*'application\/octet-stream',\s*mimeType:/g,
    "mimeType:"
  );
  
  return fixed;
}

// Process specific files with known issues
const specificFixes = [
  {
    file: 'src/app/api/auth/[...nextauth]/route.ts',
    apply: fixNextAuthImport
  },
  {
    file: 'src/app/api/platform/files/route.ts',
    apply: fixDuplicateProperties
  }
];

// Process API files with encryption issues
const encryptionFiles = [
  'src/app/api/therapist/clients/[clientId]/route.ts',
  'src/app/api/therapist/clients/route.ts',
  'src/app/api/therapist/session-notes/route.ts',
  'src/app/api/therapist/sessions/route.ts'
];

encryptionFiles.forEach(file => {
  const filePath = path.resolve(file);
  
  try {
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = fixEncryptionExports(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed encryption imports in ${path.basename(file)}`);
    }
  } catch (err) {
    console.log(`❌ Error processing ${file}: ${err.message}`);
  }
});

// Apply specific fixes
specificFixes.forEach(({ file, apply }) => {
  const filePath = path.resolve(file);
  
  try {
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    content = apply(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${path.basename(file)}`);
    }
  } catch (err) {
    console.log(`❌ Error processing ${file}: ${err.message}`);
  }
});

console.log('\n✨ Final fixes completed!');
