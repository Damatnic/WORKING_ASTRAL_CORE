#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix the remaining different patterns of duplicate id properties
function fixRemainingDuplicateIds() {
  const filesToCheck = [
    'src/app/api/admin/moderation/route.ts',
  ];

  let totalFixed = 0;

  for (const filePath of filesToCheck) {
    try {
      const fullPath = path.join(__dirname, filePath);
      if (!fs.existsSync(fullPath)) {
        console.log(`File not found: ${filePath}`);
        continue;
      }

      let content = fs.readFileSync(fullPath, 'utf8');
      let fixes = 0;
      
      // Fix pattern: id: generatePrismaCreateFields().id, id: someVariable
      const patterns = [
        {
          pattern: /id: generatePrismaCreateFields\(\)\.id, id: (\w+),/g,
          replacement: 'id: $1,'
        },
        {
          pattern: /id: generatePrismaCreateFields\(\)\.id, id: crypto\.randomUUID\(\),/g, 
          replacement: 'id: crypto.randomUUID(),'
        }
      ];

      patterns.forEach(({ pattern, replacement }) => {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, replacement);
          fixes += matches.length;
        }
      });

      if (fixes > 0) {
        fs.writeFileSync(fullPath, content);
        console.log(`✓ Fixed ${fixes} duplicate id properties in ${filePath}`);
        totalFixed += fixes;
      }
    } catch (error) {
      console.error(`Error fixing ${filePath}:`, error.message);
    }
  }

  console.log(`\nTotal fixes: ${totalFixed}`);
  console.log('Done!');
}

fixRemainingDuplicateIds();