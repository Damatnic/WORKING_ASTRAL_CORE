const fs = require('fs');
const path = require('path');

// Function to recursively find all route.ts files
function findRouteFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findRouteFiles(filePath, fileList);
    } else if (file === 'route.ts' || file === 'route.js') {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Function to fix API route URL access
function fixApiRoute(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix URL access in withAdmin, withHelper, withAuth, etc.
  const patterns = [
    // Fix new URL(req.url) pattern
    {
      from: /const\s*{\s*searchParams\s*}\s*=\s*new\s*URL\s*\(\s*req\.url\s*\)/g,
      to: 'const url = (req as any).url || req.nextUrl?.toString();\n    const { searchParams } = new URL(url)'
    },
    // Fix req.headers access
    {
      from: /req\.headers\s*\.\s*get\s*\(/g,
      to: '((req as any).headers || req).get('
    },
    // Fix req.json() access
    {
      from: /await\s+req\.json\s*\(\s*\)/g,
      to: 'await (req as any).json()'
    },
    // Add NextResponse import if missing
    {
      from: /^(import\s*{\s*NextRequest)\s*}\s*from\s*['"]next\/server['"]/m,
      to: '$1, NextResponse } from \'next/server\''
    }
  ];
  
  for (const pattern of patterns) {
    if (content.match(pattern.from)) {
      content = content.replace(pattern.from, pattern.to);
      modified = true;
    }
  }
  
  // Ensure proper imports
  if (!content.includes('NextResponse') && content.includes('NextRequest')) {
    content = content.replace(
      /import\s*{\s*NextRequest\s*}\s*from\s*['"]next\/server['"]/,
      'import { NextRequest, NextResponse } from \'next/server\''
    );
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  
  return false;
}

// Main execution
console.log('Starting API route fixes...\n');

const apiDir = path.join(__dirname, 'src', 'app', 'api');
const routeFiles = findRouteFiles(apiDir);

console.log(`Found ${routeFiles.length} route files\n`);

let fixedCount = 0;
for (const file of routeFiles) {
  if (fixApiRoute(file)) {
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} route files`);
console.log('API route fixes complete!');