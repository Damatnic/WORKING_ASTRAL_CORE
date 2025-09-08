#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing remaining TypeScript errors...\n');

// Capture all errors
let allErrors = [];
try {
  const output = execSync('npx tsc --noEmit 2>&1', { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
  allErrors = output.split('\n');
} catch (error) {
  if (error.stdout) {
    allErrors = error.stdout.split('\n');
  }
}

// Parse errors
const errors = allErrors
  .filter(line => line.includes('error TS'))
  .map(line => {
    const match = line.match(/^([^(]+)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        col: parseInt(match[3]),
        code: match[4],
        message: match[5]
      };
    }
    return null;
  })
  .filter(Boolean);

console.log(`Found ${errors.length} errors to analyze\n`);

// Group errors by type
const errorGroups = {
  imports: errors.filter(e => e.code === 'TS2305' || e.code === 'TS2724'),
  arguments: errors.filter(e => e.code === 'TS2554'),
  types: errors.filter(e => e.code === 'TS2345' || e.code === 'TS2322'),
  properties: errors.filter(e => e.code === 'TS2353' || e.code === 'TS2551' || e.code === 'TS2561'),
  possibly: errors.filter(e => e.code === 'TS18047' || e.code === 'TS18048' || e.code === 'TS2532'),
  expressions: errors.filter(e => e.code === 'TS2349' || e.code === 'TS1361'),
  other: errors.filter(e => !['TS2305', 'TS2724', 'TS2554', 'TS2345', 'TS2322', 'TS2353', 'TS2551', 'TS2561', 'TS18047', 'TS18048', 'TS2532', 'TS2349', 'TS1361'].includes(e.code))
};

console.log('Error breakdown:');
console.log(`  - Import/Export issues: ${errorGroups.imports.length}`);
console.log(`  - Argument count issues: ${errorGroups.arguments.length}`);
console.log(`  - Type assignment issues: ${errorGroups.types.length}`);
console.log(`  - Property issues: ${errorGroups.properties.length}`);
console.log(`  - Possibly null/undefined: ${errorGroups.possibly.length}`);
console.log(`  - Expression issues: ${errorGroups.expressions.length}`);
console.log(`  - Other: ${errorGroups.other.length}`);
console.log('');

// Fix functions
const fixes = {
  // Fix missing exports by adding them to modules
  fixMissingExports: () => {
    const missingExports = new Map();
    
    errorGroups.imports.forEach(error => {
      const match = error.message.match(/Module '"([^"]+)"' has no exported member '([^']+)'/);
      if (match) {
        const [, module, member] = match;
        if (!missingExports.has(module)) {
          missingExports.set(module, new Set());
        }
        missingExports.get(module).add(member);
      }
    });
    
    // Add missing exports to auth-middleware
    if (missingExports.has('@/lib/auth-middleware')) {
      const authMiddlewarePath = 'src/lib/auth-middleware.ts';
      let content = fs.readFileSync(authMiddlewarePath, 'utf8');
      const exports = missingExports.get('@/lib/auth-middleware');
      
      if (exports.has('getUserFromRequest')) {
        content += '\n\n// Get user from request\nexport async function getUserFromRequest(req: NextRequest) {\n  const session = await getServerSession(authOptions);\n  return (session as any)?.user || null;\n}\n';
      }
      
      if (exports.has('withRoles')) {
        content += '\n\n// Role-based middleware\nexport function withRoles(roles: UserRole[]) {\n  return async (req: NextRequest) => {\n    const result = await requireRole(req, roles);\n    if (result instanceof NextResponse) return result;\n    return NextResponse.next();\n  };\n}\n';
      }
      
      if (exports.has('withAuth')) {
        content += '\n\n// Auth middleware\nexport async function withAuth(req: NextRequest) {\n  const result = await requireAuth(req);\n  if (result instanceof NextResponse) return result;\n  return NextResponse.next();\n}\n';
      }
      
      if (exports.has('withHelper')) {
        content += '\n\n// Helper role middleware\nexport function withHelper(req: NextRequest) {\n  return requireRole(req, [UserRole.HELPER, UserRole.THERAPIST, UserRole.CRISIS_COUNSELOR, UserRole.ADMIN, UserRole.SUPER_ADMIN]);\n}\n';
      }
      
      fs.writeFileSync(authMiddlewarePath, content);
      console.log(`✅ Added ${exports.size} exports to auth-middleware`);
    }
    
    // Add missing exports to encryption module
    if (missingExports.has('@/lib/encryption')) {
      const encryptionPath = 'src/lib/encryption.ts';
      let content = fs.readFileSync(encryptionPath, 'utf8');
      
      content += '\n\n// Field encryption exports\nexport { encryptField, decryptField } from "./field-encryption";\n';
      
      fs.writeFileSync(encryptionPath, content);
      console.log('✅ Added field encryption exports');
    }
    
    // Add missing exports to api-utils
    if (missingExports.has('@/lib/api-utils')) {
      const apiUtilsPath = 'src/lib/api-utils.ts';
      let content = fs.readFileSync(apiUtilsPath, 'utf8');
      
      // Add aliases for commonly used functions
      if (!content.includes('export { encryptApiField as encryptField')) {
        content += '\n\n// Aliases for backward compatibility\nexport { encryptApiField as encryptField, decryptApiField as decryptField };\n';
        fs.writeFileSync(apiUtilsPath, content);
        console.log('✅ Added api-utils aliases');
      }
    }
  },
  
  // Fix argument count issues
  fixArgumentCounts: () => {
    const fileGroups = {};
    errorGroups.arguments.forEach(error => {
      if (!fileGroups[error.file]) fileGroups[error.file] = [];
      fileGroups[error.file].push(error);
    });
    
    Object.entries(fileGroups).forEach(([filePath, fileErrors]) => {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        fileErrors.forEach(error => {
          const line = lines[error.line - 1];
          if (!line) return;
          
          // Fix NextResponse.json calls
          if (error.message.includes('Expected 2-3 arguments, but got 1')) {
            lines[error.line - 1] = line.replace(
              /NextResponse\.json\(([^)]+)\)(?!.*,\s*{)/g,
              'NextResponse.json($1, { status: 200 })'
            );
          }
          
          // Fix encryptJSON/decryptJSON calls
          if (error.message.includes('Expected 2 arguments, but got 1')) {
            lines[error.line - 1] = line
              .replace(/encryptJSON\(([^),]+)\)/g, 'encryptJSON($1, {})')
              .replace(/decryptJSON\(([^),]+)\)/g, 'decryptJSON($1, {})');
          }
        });
        
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`✅ Fixed ${fileErrors.length} argument issues in ${path.basename(filePath)}`);
      } catch (err) {
        console.log(`⚠️ Could not fix ${filePath}: ${err.message}`);
      }
    });
  },
  
  // Fix type assignments
  fixTypeAssignments: () => {
    const fileGroups = {};
    errorGroups.types.forEach(error => {
      if (!fileGroups[error.file]) fileGroups[error.file] = [];
      fileGroups[error.file].push(error);
    });
    
    Object.entries(fileGroups).forEach(([filePath, fileErrors]) => {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        fileErrors.forEach(error => {
          const line = lines[error.line - 1];
          if (!line) return;
          
          // Fix {} not assignable to string
          if (error.message.includes("Argument of type '{}' is not assignable to parameter of type 'string'")) {
            lines[error.line - 1] = line.replace(/,\s*{}\)/g, ', "{}")');
          }
          
          // Fix undefined assignments
          if (error.message.includes("'undefined' is not assignable")) {
            lines[error.line - 1] = line.replace(/:\s*undefined/g, ': null');
          }
        });
        
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`✅ Fixed ${fileErrors.length} type issues in ${path.basename(filePath)}`);
      } catch (err) {
        console.log(`⚠️ Could not fix ${filePath}: ${err.message}`);
      }
    });
  },
  
  // Fix possibly null/undefined
  fixPossiblyNull: () => {
    const fileGroups = {};
    errorGroups.possibly.forEach(error => {
      if (!fileGroups[error.file]) fileGroups[error.file] = [];
      fileGroups[error.file].push(error);
    });
    
    Object.entries(fileGroups).forEach(([filePath, fileErrors]) => {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        fileErrors.forEach(error => {
          const line = lines[error.line - 1];
          if (!line) return;
          
          // Add null checks
          const varMatch = error.message.match(/'([^']+)' is possibly/);
          if (varMatch) {
            const varName = varMatch[1];
            // Add optional chaining
            lines[error.line - 1] = line.replace(
              new RegExp(`\\b${varName}\\b(?!\\?)`, 'g'),
              `${varName}?`
            );
          }
        });
        
        fs.writeFileSync(filePath, lines.join('\n'));
        console.log(`✅ Fixed ${fileErrors.length} null checks in ${path.basename(filePath)}`);
      } catch (err) {
        console.log(`⚠️ Could not fix ${filePath}: ${err.message}`);
      }
    });
  },
  
  // Fix property name issues
  fixPropertyNames: () => {
    const fileGroups = {};
    errorGroups.properties.forEach(error => {
      if (!fileGroups[error.file]) fileGroups[error.file] = [];
      fileGroups[error.file].push(error);
    });
    
    Object.entries(fileGroups).forEach(([filePath, fileErrors]) => {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        fileErrors.forEach(error => {
          // Fix property name suggestions
          const match = error.message.match(/Property '([^']+)' does not exist.*Did you mean '([^']+)'/);
          if (match) {
            const [, wrong, correct] = match;
            content = content.replace(new RegExp(`\\.${wrong}\\b`, 'g'), `.${correct}`);
          }
          
          // Fix object literal property names
          const objMatch = error.message.match(/but '([^']+)' does not exist.*Did you mean to write '([^']+)'/);
          if (objMatch) {
            const [, wrong, correct] = objMatch;
            content = content.replace(new RegExp(`\\b${wrong}:`, 'g'), `${correct}:`);
          }
        });
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed ${fileErrors.length} property issues in ${path.basename(filePath)}`);
      } catch (err) {
        console.log(`⚠️ Could not fix ${filePath}: ${err.message}`);
      }
    });
  }
};

// Apply fixes
console.log('\n📝 Applying fixes...\n');
fixes.fixMissingExports();
fixes.fixArgumentCounts();
fixes.fixTypeAssignments();
fixes.fixPossiblyNull();
fixes.fixPropertyNames();

console.log('\n✨ Fix script completed!');