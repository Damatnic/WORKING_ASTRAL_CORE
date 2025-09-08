#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing broken NextResponse.json calls...\n');

// Files with broken response calls
const filesToFix = [
  'src/app/api/audit/events/route.ts',
  'src/app/api/messaging/notifications/route.ts',
  'src/app/api/platform/notifications/route.ts',
  'src/app/api/platform/notifications/preferences/route.ts',
  'src/app/api/platform/notifications/templates/route.ts'
];

filesToFix.forEach(file => {
  const filePath = path.resolve(file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changeCount = 0;
    
    // Fix patterns like: NextResponse.json(..., { status: 200 }, { status: 200 })
    // Should be: NextResponse.json(..., { status: 200 })
    content = content.replace(
      /NextResponse\.json\(([^)]+)\),\s*\{\s*status:\s*\d+\s*\}\s*,\s*\{\s*status:\s*\d+\s*\}/g,
      (match, args) => {
        changeCount++;
        return `NextResponse.json(${args})`;
      }
    );
    
    // Fix patterns like: }, { status: 400 }, { status: 200 });
    // Should be: }, { status: 400 });
    content = content.replace(
      /\},\s*\{\s*status:\s*(\d+)\s*\}\s*,\s*\{\s*status:\s*\d+\s*\}\)/g,
      (match, status) => {
        changeCount++;
        return `}, { status: ${status} })`;
      }
    );
    
    // Fix patterns like: (error as z.ZodError, { status: 200 }).issues
    // Should be: (error as z.ZodError).issues
    content = content.replace(
      /\(error as z\.ZodError,\s*\{\s*status:\s*\d+\s*\}\)/g,
      '(error as z.ZodError)'
    );
    
    // Fix double status in return statements
    content = content.replace(
      /return NextResponse\.json\(([^)]+)\)\s*,\s*\{\s*status:\s*(\d+)\s*\}/g,
      'return NextResponse.json($1, { status: $2 })'
    );
    
    if (changeCount > 0 || content.includes('(error as z.ZodError, {')) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${path.basename(file)}`);
    }
  } catch (err) {
    console.log(`⚠️ Could not process ${file}: ${err.message}`);
  }
});

console.log('\n✨ Response fixes completed!');