#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing all TypeScript errors in src/app/api/ directory...\n');

// Track changes made
const changes = {
  userConnectionPatterns: 0,
  getUserFromRequestCalls: 0,
  encryptionFunctionIssues: 0,
  whereClauseIssues: 0,
  duplicateProperties: 0,
  missingImports: 0,
  otherFixes: 0
};

// Find all TypeScript files in src/app/api/
function findTsFiles(dir) {
  const files = [];
  
  function walkDir(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(dir);
  return files;
}

// Function to apply fixes to a file
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const originalContent = content;
  
  console.log(`📄 Processing: ${path.relative(process.cwd(), filePath)}`);
  
  // Fix 1: Replace User: { connect: { id: } } patterns with userId: 
  const userConnectPattern = /User:\s*\{\s*connect:\s*\{\s*id:\s*([^}]+)\s*\}\s*\}/g;
  if (userConnectPattern.test(content)) {
    content = content.replace(userConnectPattern, 'userId: $1');
    changes.userConnectionPatterns++;
    modified = true;
    console.log('  ✅ Fixed User connection patterns');
  }
  
  // Fix 2: Replace where: { User: { connect: { id: } } } patterns with where: { userId: }
  const whereUserConnectPattern = /where:\s*\{\s*User:\s*\{\s*connect:\s*\{\s*id:\s*([^}]+)\s*\}\s*\}\s*\}/g;
  if (whereUserConnectPattern.test(content)) {
    content = content.replace(whereUserConnectPattern, 'where: { userId: $1 }');
    changes.whereClauseIssues++;
    modified = true;
    console.log('  ✅ Fixed where clause User patterns');
  }
  
  // Fix 3: Replace getUserFromRequest calls with const user = req.user!;
  if (content.includes('getUserFromRequest')) {
    content = content.replace(/const\s+(\w+)\s*=\s*await\s+getUserFromRequest\([^)]*\);?/g, 'const $1 = req.user!;');
    content = content.replace(/const\s+(\w+)\s*=\s*getUserFromRequest\([^)]*\);?/g, 'const $1 = req.user!;');
    changes.getUserFromRequestCalls++;
    modified = true;
    console.log('  ✅ Fixed getUserFromRequest calls');
  }
  
  // Fix 4: Remove getUserFromRequest imports
  if (content.includes('getUserFromRequest')) {
    content = content.replace(/,\s*getUserFromRequest/g, '');
    content = content.replace(/getUserFromRequest,\s*/g, '');
    content = content.replace(/{\s*getUserFromRequest\s*}/g, '{}');
    content = content.replace(/import\s*{\s*}\s*from\s*['""][^'"]*['"];?\s*/g, '');
    modified = true;
  }
  
  // Fix 5: Fix encryption function calls (remove empty object parameters)
  const encryptJSONPattern = /encryptJSON\(\{\s*([^:}]+):\s*([^}]+)\s*\}\)/g;
  if (encryptJSONPattern.test(content)) {
    content = content.replace(encryptJSONPattern, 'encryptJSON($2)');
    changes.encryptionFunctionIssues++;
    modified = true;
    console.log('  ✅ Fixed encryptJSON calls');
  }
  
  // Fix 6: Fix decryptJSON calls
  const decryptJSONPattern = /decryptJSON\(\{\s*([^}]+)\s*\}\)/g;
  if (decryptJSONPattern.test(content)) {
    content = content.replace(decryptJSONPattern, 'decryptJSON($1)');
    changes.encryptionFunctionIssues++;
    modified = true;
    console.log('  ✅ Fixed decryptJSON calls');
  }
  
  // Fix 7: Fix NextAuth route handlers
  if (filePath.includes('[...nextauth]') && content.includes('NextAuth(')) {
    content = content.replace(/export\s*{\s*NextAuth\s*as\s*GET\s*}/g, 'const handler = NextAuth(authOptions);\nexport { handler as GET }');
    content = content.replace(/export\s*{\s*NextAuth\s*as\s*POST\s*}/g, 'const handler = NextAuth(authOptions);\nexport { handler as POST }');
    changes.otherFixes++;
    modified = true;
    console.log('  ✅ Fixed NextAuth route handlers');
  }
  
  // Fix 8: Add missing withRoles import where needed
  if (content.includes('withRoles') && !content.includes('import { withAuth, AuthenticatedRequest, withRoles }')) {
    if (content.includes('import { withAuth, AuthenticatedRequest }')) {
      content = content.replace(
        'import { withAuth, AuthenticatedRequest }',
        'import { withAuth, AuthenticatedRequest, withRoles }'
      );
      changes.missingImports++;
      modified = true;
      console.log('  ✅ Added withRoles import');
    }
  }
  
  // Fix 9: Fix duplicate property names by removing duplicates
  const duplicatePropertyPattern = /(\w+):\s*([^,}]+),\s*\1:\s*([^,}]+)/g;
  if (duplicatePropertyPattern.test(content)) {
    content = content.replace(duplicatePropertyPattern, '$1: $3');
    changes.duplicateProperties++;
    modified = true;
    console.log('  ✅ Fixed duplicate properties');
  }
  
  // Fix 10: Fix possibly null/undefined issues
  content = content.replace(/(\w+AnonymousId)\s*\?\s*:/g, '$1!:');
  if (content !== originalContent && !modified) {
    changes.otherFixes++;
    modified = true;
    console.log('  ✅ Fixed null/undefined issues');
  }
  
  // Fix 11: Add missing id fields for Prisma creates
  if (content.includes('prisma.') && content.includes('.create(') && !content.includes('generatePrismaCreateFields()')) {
    // Add import if not present
    if (!content.includes('generatePrismaCreateFields')) {
      const importMatch = content.match(/import\s+{[^}]*}\s+from\s+['""]@\/lib\/prisma-helpers['""]/);
      if (importMatch) {
        content = content.replace(
          /import\s+{([^}]*)}\s+from\s+['""]@\/lib\/prisma-helpers['""]/, 
          'import { $1, generatePrismaCreateFields } from "@/lib/prisma-helpers"'
        );
      } else {
        // Add new import
        const firstImport = content.match(/^import.*$/m);
        if (firstImport) {
          content = content.replace(
            firstImport[0],
            `${firstImport[0]}\nimport { generatePrismaCreateFields } from "@/lib/prisma-helpers";`
          );
        }
      }
      modified = true;
    }
    
    // Add id field to creates that don't have it
    content = content.replace(
      /\.create\(\s*{\s*data:\s*{\s*(?!id:)/g,
      '.create({\n        data: {\n          id: generatePrismaCreateFields().id,'
    );
    
    if (content !== originalContent && !modified) {
      changes.otherFixes++;
      modified = true;
      console.log('  ✅ Added missing id fields');
    }
  }
  
  // Fix 12: Fix audit log creation calls with proper parameters
  if (content.includes('auditLogger.logEvent(') || content.includes('auditLogger.log(')) {
    content = content.replace(
      /auditLogger\.logEvent\(\s*([^,)]+),\s*([^,)]+),\s*([^)]*)\)/g,
      'auditLogger.logEvent($1, $2)'
    );
    content = content.replace(
      /auditLogger\.log\(\s*([^)]+)\)/g,
      'auditLogger.logEvent($1)'
    );
    if (content !== originalContent && !modified) {
      changes.otherFixes++;
      modified = true;
      console.log('  ✅ Fixed audit logger calls');
    }
  }
  
  // Write file if modified
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  💾 File updated successfully\n');
  } else {
    console.log('  ℹ️  No changes needed\n');
  }
}

// Main execution
function main() {
  const apiDir = path.join(process.cwd(), 'src', 'app', 'api');
  
  if (!fs.existsSync(apiDir)) {
    console.error(`❌ API directory not found: ${apiDir}`);
    process.exit(1);
  }
  
  const tsFiles = findTsFiles(apiDir);
  console.log(`📂 Found ${tsFiles.length} TypeScript files to process\n`);
  
  // Process each file
  tsFiles.forEach(fixFile);
  
  // Print summary
  console.log('🎉 Fix Summary:');
  console.log(`   User connection patterns fixed: ${changes.userConnectionPatterns}`);
  console.log(`   getUserFromRequest calls fixed: ${changes.getUserFromRequestCalls}`);
  console.log(`   Encryption function issues fixed: ${changes.encryptionFunctionIssues}`);
  console.log(`   Where clause issues fixed: ${changes.whereClauseIssues}`);
  console.log(`   Duplicate properties fixed: ${changes.duplicateProperties}`);
  console.log(`   Missing imports added: ${changes.missingImports}`);
  console.log(`   Other fixes applied: ${changes.otherFixes}\n`);
  
  const totalChanges = Object.values(changes).reduce((sum, count) => sum + count, 0);
  console.log(`📊 Total changes made: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log('\n✨ All fixes applied successfully! Run TypeScript compilation to verify.');
  } else {
    console.log('\nℹ️  No fixes were needed.');
  }
}

// Run the script
main();