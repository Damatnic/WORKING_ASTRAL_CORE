const fs = require('fs');
const path = require('path');

// Files that need fixing
const files = [
  'src/app/api/therapist/session-notes/route.ts',
  'src/app/api/therapist/clients/route.ts',
  'src/app/api/therapist/sessions/route.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix the incorrect import
  const oldImport = "import { encryptJSON as encryptApiField, decryptJSON as decryptApiField } from '@/lib/encryption';";
  const newImport = "import { encryptApiField, decryptApiField } from '@/lib/api-utils';";
  
  if (content.includes(oldImport)) {
    content = content.replace(oldImport, newImport);
    modified = true;
  }
  
  // Also check for variations
  const oldImport2 = /import\s*\{\s*encryptJSON\s+as\s+encryptApiField\s*,\s*decryptJSON\s+as\s+decryptApiField\s*\}\s*from\s*['"]@\/lib\/encryption['"]/g;
  if (oldImport2.test(content)) {
    content = content.replace(oldImport2, newImport);
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`No changes needed: ${file}`);
  }
});

console.log('Done fixing therapist imports!');