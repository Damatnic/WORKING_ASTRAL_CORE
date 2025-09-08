#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Fixing encryptJSON syntax errors...\n');

// Find all files with TypeScript errors
const tsFiles = glob.sync('src/app/api/**/*.ts', { cwd: process.cwd() });

tsFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  
  // Fix broken encryptJSON calls with object literal syntax errors
  // Pattern: encryptJSON(param, key: value, key2: value2, ...)
  let modified = false;
  
  // Find and fix encryptJSON calls that are missing opening brace
  const encryptJSONPattern = /encryptJSON\(([^{][^)]*)\)/g;
  let match;
  
  while ((match = encryptJSONPattern.exec(originalContent)) !== null) {
    const fullMatch = match[0];
    const params = match[1];
    
    // Check if this looks like it should be an object literal
    if (params.includes(':') && !params.trim().startsWith('{')) {
      // Try to parse the parameters as key-value pairs
      const pairs = params.split(',').map(pair => pair.trim());
      const objectPairs = [];
      
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        if (pair.includes(':')) {
          objectPairs.push(pair);
        } else if (i === 0) {
          // First parameter might be a value that should be a key
          objectPairs.push(`data: ${pair}`);
        }
      }
      
      if (objectPairs.length > 0) {
        const newCall = `encryptJSON({ ${objectPairs.join(', ')} })`;
        content = content.replace(fullMatch, newCall);
        modified = true;
      }
    }
  }
  
  // Additional patterns for specific broken cases
  content = content.replace(
    /encryptJSON\(([^,)]+),\s*([^:,)]+):\s*([^,)]+),?\s*\)/g,
    (match, p1, p2, p3) => {
      if (!p1.includes('{')) {
        return `encryptJSON({ ${p1.includes(':') ? p1 : `data: ${p1}`}, ${p2}: ${p3} })`;
      }
      return match;
    }
  );
  
  // Fix multiple parameter patterns
  content = content.replace(
    /encryptJSON\(([^{,)]+),\s*([\s\S]*?)\)/g,
    (match, firstParam, restParams) => {
      if (restParams.includes(':') && !restParams.trim().startsWith('{')) {
        // Convert to object literal
        const cleanRest = restParams.replace(/,$/, '').trim();
        return `encryptJSON({ ${firstParam.includes(':') ? firstParam : `data: ${firstParam}`}, ${cleanRest} })`;
      }
      return match;
    }
  );
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    modified = true;
  }
});

console.log('\n🎉 encryptJSON syntax fixes completed!');