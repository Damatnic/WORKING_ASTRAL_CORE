#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix req vs request issues in MFA routes
function fixMFARequestIssues() {
  const mfaFiles = [
    'src/app/api/auth/mfa/manage/route.ts',
    'src/app/api/auth/mfa/setup/route.ts', 
    'src/app/api/auth/mfa/verify/route.ts'
  ];

  let totalFixed = 0;

  for (const filePath of mfaFiles) {
    try {
      const fullPath = path.join(__dirname, filePath);
      if (!fs.existsSync(fullPath)) {
        console.log(`File not found: ${filePath}`);
        continue;
      }

      let content = fs.readFileSync(fullPath, 'utf8');
      let fixes = 0;

      // Fix: const user = req.user!;
      if (content.includes('const user = req.user!;')) {
        content = content.replace(/const user = req\.user!/g, 'const user = (request as any).user!');
        fixes++;
      }

      // Fix: req.user! (not in const assignment)
      if (content.includes('req.user!') && !content.includes('const user = req.user!')) {
        content = content.replace(/req\.user!/g, '(request as any).user!');
        fixes++;
      }

      if (fixes > 0) {
        fs.writeFileSync(fullPath, content);
        console.log(`✓ Fixed ${fixes} req/request issues in ${filePath}`);
        totalFixed += fixes;
      }
    } catch (error) {
      console.error(`Error fixing ${filePath}:`, error.message);
    }
  }

  console.log(`\nTotal fixes: ${totalFixed}`);
  console.log('Done!');
}

fixMFARequestIssues();