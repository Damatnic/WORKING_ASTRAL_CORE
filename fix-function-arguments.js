#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing function argument issues...\n');

// Files with known argument issues
const fixes = [
  {
    file: 'src/app/api/therapy/appointments/route.ts',
    fixes: [
      // Fix decryptJSON calls - should have default value as second argument
      { 
        find: /decryptJSON\(([^,)]+)\s+as\s+string,\s*{}\)/g,
        replace: 'decryptJSON($1 as string)'
      },
      {
        find: /encryptJSON\(([^,)]+),\s*{}\)/g,
        replace: 'encryptJSON($1)'
      }
    ]
  },
  {
    file: 'src/app/api/therapy/assessments/route.ts',
    fixes: [
      {
        find: /decryptJSON\(([^,)]+)\s+as\s+string,\s*{}\)/g,
        replace: 'decryptJSON($1 as string)'
      },
      {
        find: /encryptJSON\(([^,)]+),\s*{}\)/g,
        replace: 'encryptJSON($1)'
      }
    ]
  },
  {
    file: 'src/app/api/therapy/billing/route.ts',
    fixes: [
      {
        find: /decryptJSON\(([^,)]+)\s+as\s+string,\s*{}\)/g,
        replace: 'decryptJSON($1 as string)'
      },
      {
        find: /encryptJSON\(([^,)]+),\s*{}\)/g,
        replace: 'encryptJSON($1)'
      }
    ]
  },
  {
    file: 'src/app/api/therapy/clients/route.ts',
    fixes: [
      {
        find: /decryptJSON\(([^,)]+)\s+as\s+string,\s*{}\)/g,
        replace: 'decryptJSON($1 as string)'
      },
      {
        find: /encryptJSON\(([^,)]+),\s*{}\)/g,
        replace: 'encryptJSON($1)'
      }
    ]
  },
  {
    file: 'src/app/api/therapy/dashboard/route.ts',
    fixes: [
      {
        find: /decryptJSON\(([^,)]+)\s+as\s+string,\s*{}\)/g,
        replace: 'decryptJSON($1 as string)'
      }
    ]
  },
  {
    file: 'src/app/api/therapy/notes/route.ts',
    fixes: [
      {
        find: /decryptJSON\(([^,)]+)\s+as\s+string,\s*{}\)/g,
        replace: 'decryptJSON($1 as string)'
      },
      {
        find: /encryptJSON\(([^,)]+),\s*{}\)/g,
        replace: 'encryptJSON($1)'
      },
      {
        find: /encrypt\(([^,)]+),\s*{}\)/g,
        replace: 'encrypt($1)'
      }
    ]
  },
  {
    file: 'src/app/api/therapy/sessions/route.ts',
    fixes: [
      {
        find: /decryptJSON\(([^,)]+)\s+as\s+string,\s*{}\)/g,
        replace: 'decryptJSON($1 as string)'
      },
      {
        find: /encryptJSON\(([^,)]+),\s*{}\)/g,
        replace: 'encryptJSON($1)'
      }
    ]
  },
  {
    file: 'src/app/api/therapy/treatment-plans/route.ts',
    fixes: [
      {
        find: /decryptJSON\(([^,)]+)\s+as\s+string,\s*{}\)/g,
        replace: 'decryptJSON($1 as string)'
      },
      {
        find: /encryptJSON\(([^,)]+),\s*{}\)/g,
        replace: 'encryptJSON($1)'
      }
    ]
  },
  {
    file: 'src/app/api/audit/events/route.ts',
    fixes: [
      {
        find: /NextResponse\.json\(([^)]+)\)(?!\s*,)/g,
        replace: 'NextResponse.json($1, { status: 200 })'
      }
    ]
  },
  {
    file: 'src/app/api/messaging/notifications/route.ts',
    fixes: [
      {
        find: /NextResponse\.json\(([^)]+)\)(?!\s*,)/g,
        replace: 'NextResponse.json($1, { status: 200 })'
      }
    ]
  },
  {
    file: 'src/app/api/platform/notifications/route.ts',
    fixes: [
      {
        find: /NextResponse\.json\(([^)]+)\)(?!\s*,)/g,
        replace: 'NextResponse.json($1, { status: 200 })'
      }
    ]
  },
  {
    file: 'src/app/api/platform/notifications/preferences/route.ts',
    fixes: [
      {
        find: /NextResponse\.json\(([^)]+)\)(?!\s*,)/g,
        replace: 'NextResponse.json($1, { status: 200 })'
      }
    ]
  },
  {
    file: 'src/app/api/platform/notifications/templates/route.ts',
    fixes: [
      {
        find: /NextResponse\.json\(([^)]+)\)(?!\s*,)/g,
        replace: 'NextResponse.json($1, { status: 200 })'
      }
    ]
  },
  {
    file: 'src/app/api/websocket/route.ts',
    fixes: [
      {
        find: /new\s+Response\(\)/g,
        replace: 'new Response("WebSocket endpoint", { status: 101 })'
      }
    ]
  }
];

// Apply fixes
fixes.forEach(({ file, fixes: fileFixes }) => {
  const filePath = path.resolve(file);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changeCount = 0;
    
    fileFixes.forEach(fix => {
      const matches = content.match(fix.find);
      if (matches) {
        content = content.replace(fix.find, fix.replace);
        changeCount += matches.length;
      }
    });
    
    if (changeCount > 0) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${changeCount} issues in ${path.basename(file)}`);
    }
  } catch (err) {
    console.log(`⚠️ Could not process ${file}: ${err.message}`);
  }
});

console.log('\n✨ Argument fixes completed!');