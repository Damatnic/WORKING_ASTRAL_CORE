#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix common TypeScript errors automatically
const filesToFix = [
  'src/components/community/CommunityFeed.tsx',
  'src/components/crisis/CrisisAlertSystem.tsx',
  'src/components/helper/HelperDashboard.tsx',
  'src/components/journal/ReflectionPrompts.tsx',
  'src/components/loading/ProgressiveLoader.tsx',
];

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix avatar: undefined to avatar: ""
    content = content.replace(/avatar: undefined/g, 'avatar: ""');
    
    // Fix possibly undefined with fallback
    content = content.replace(/(\w+)\s*\|\s*undefined/g, '($1 || "")');
    
    // Add null checks
    content = content.replace(/stages\[/g, 'stages?.[');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
});

console.log('Done fixing common errors');