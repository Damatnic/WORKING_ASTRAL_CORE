#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

async function fixDuplicateIds() {
  console.log('Finding all TypeScript files in API routes...');
  
  // Find all API route files
  const files = await glob('src/app/api/**/*.ts', { 
    cwd: __dirname, 
    ignore: 'node_modules/**' 
  });
  
  console.log(`Found ${files.length} API files to check`);
  
  let totalFixed = 0;
  
  for (const filePath of files) {
    try {
      const fullPath = path.join(__dirname, filePath);
      let content = fs.readFileSync(fullPath, 'utf8');
      let fixes = 0;
      
      // Only fix the specific duplicate id pattern we know is problematic
      const duplicateIdPattern = /id: generatePrismaCreateFields\(\)\.id, id: crypto\.randomUUID\(\),/g;
      
      if (content.includes('id: generatePrismaCreateFields().id, id: crypto.randomUUID(),')) {
        content = content.replace(duplicateIdPattern, 'id: crypto.randomUUID(),');
        fixes++;
        fs.writeFileSync(fullPath, content);
        console.log(`✓ Fixed ${fixes} duplicate id properties in ${filePath}`);
        totalFixed += fixes;
      }
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }
  
  console.log(`\nTotal fixes: ${totalFixed}`);
  console.log('Done!');
}

fixDuplicateIds();