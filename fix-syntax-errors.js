#!/usr/bin/env node

const fs = require('fs');

// Files with syntax errors from double casting
const filesToFix = [
  'src/contexts/AuthContext.tsx',
  'src/hooks/useWebSocket.ts', 
  'src/lib/cache/redis-cache.ts',
  'src/lib/crisis-alert-system.ts',
  'src/lib/notifications/notification-service.ts'
];

function fixDoubleCasting(content) {
  // Fix patterns like ((obj as any) as any).property
  content = content.replace(/\(\(([^)]+) as any\) as any\)/g, '($1 as any)');
  
  // Fix patterns like (obj as any) as any).property  
  content = content.replace(/\(([^)]+) as any\) as any\)/g, '($1 as any)');
  
  // Fix unclosed parentheses from bad replacements
  content = content.replace(/\(([^)]+) as any\)\)/g, '($1 as any)');
  
  return content;
}

filesToFix.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf-8');
    const fixed = fixDoubleCasting(content);
    
    if (content !== fixed) {
      fs.writeFileSync(file, fixed, 'utf-8');
      console.log(`✅ Fixed syntax in ${file}`);
    }
  } catch (err) {
    console.error(`❌ Error processing ${file}:`, err.message);
  }
});

console.log('\n✨ Syntax fixes complete');