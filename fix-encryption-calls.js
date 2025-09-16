const fs = require('fs');
const path = require('path');

// List of files that need fixing
const files = [
  'src/app/api/messaging/notifications/route.ts',
  'src/app/api/platform/notifications/preferences/route.ts',
  'src/app/api/platform/notifications/route.ts',
  'src/app/api/platform/notifications/templates/route.ts',
  'src/app/api/therapist/clients/[clientId]/route.ts',
  'src/app/api/therapist/clients/route.ts',
  'src/app/api/therapist/sessions/route.ts',
  'src/app/api/therapy/billing/route.ts',
  'src/app/api/therapy/clients/route.ts',
  'src/app/api/therapy/dashboard/route.ts',
  'src/app/api/therapy/notes/route.ts',
  'src/app/api/therapy/treatment-plans/route.ts',
  'src/app/api/therapy/sessions/route.ts',
  'src/app/api/therapy/assessments/route.ts',
  'src/app/api/therapy/appointments/route.ts',
  'src/app/api/crisis/reports/route.ts',
  'src/app/api/crisis/interventions/route.ts',
  'src/app/api/crisis/safety-plans/route.ts'
];

const encryptionKey = "process.env.ENCRYPTION_KEY || 'default-key-for-development'";

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Fix encryptJSON calls - match various patterns
  content = content.replace(/encryptJSON\(([^)]+)\)(?!\s*,)/g, (match, p1) => {
    // Check if it already has two parameters
    const commaCount = (p1.match(/,/g) || []).length;
    const openParens = (p1.match(/\(/g) || []).length;
    const closeParens = (p1.match(/\)/g) || []).length;
    
    // If there's a comma at the top level (not inside nested parens), it already has 2 params
    if (commaCount > openParens) {
      return match; // Already has second parameter
    }
    
    modified = true;
    return `encryptJSON(${p1}, ${encryptionKey})`;
  });
  
  // Fix decryptJSON calls
  content = content.replace(/decryptJSON\(([^)]+)\)(?!\s*,)/g, (match, p1) => {
    // Check if it already has two parameters
    const commaCount = (p1.match(/,/g) || []).length;
    const openParens = (p1.match(/\(/g) || []).length;
    const closeParens = (p1.match(/\)/g) || []).length;
    
    // If there's a comma at the top level (not inside nested parens), it already has 2 params
    if (commaCount > openParens) {
      return match; // Already has second parameter
    }
    
    modified = true;
    return `decryptJSON(${p1}, ${encryptionKey})`;
  });
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`No changes needed: ${file}`);
  }
});

console.log('Done fixing encryption calls!');