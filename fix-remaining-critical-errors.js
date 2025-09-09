const fs = require('fs');

console.log('🔧 Starting remaining critical error fixes...');

// Fix NextAuth type declarations
const nextAuthTypesPath = 'src/types/next-auth.ts';
const nextAuthTypesContent = `import { DefaultSession, DefaultUser } from 'next-auth';
import { UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      name?: string | null;
      email: string;
      image?: string | null;
      role: UserRole;
      isEmailVerified: boolean;
      onboardingCompleted: boolean;
      anonymousId?: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: string;
    name?: string | null;
    email: string;
    image?: string | null;
    role: UserRole;
    isEmailVerified: boolean;
    onboardingCompleted: boolean;
    anonymousId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    isEmailVerified: boolean;
    onboardingCompleted: boolean;
    anonymousId?: string;
  }
}
`;

// Fix zod imports in validation files
const validationFiles = [
  'src/lib/validation.ts',
  'src/lib/validation/validation-middleware.ts',
  'src/lib/session/session-manager.ts',
  'src/app/api/platform/search/route.ts',
  'src/app/api/therapist/clients/[clientId]/route.ts',
  'src/app/api/therapist/clients/route.ts',
  'src/app/api/therapist/session-notes/route.ts',
  'src/app/api/therapist/sessions/route.ts',
  'src/lib/prisma-helpers.ts'
];

// Fix Prisma duplicate declaration
const prismaPath = 'src/lib/prisma.ts';
fs.readFile(prismaPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading prisma.ts:', err);
    return;
  }

  // Remove duplicate prisma declaration
  const fixedContent = data.replace(/const prisma[\s\S]*?export { prisma };/g, '').trim() + `

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { prisma };
export default prisma;
`;

  fs.writeFile(prismaPath, fixedContent, 'utf8', (writeErr) => {
    if (writeErr) {
      console.error('Error writing prisma.ts:', writeErr);
    } else {
      console.log('✅ Fixed Prisma duplicate declaration');
    }
  });
});

// Write the fixed NextAuth types
fs.writeFileSync(nextAuthTypesPath, nextAuthTypesContent);
console.log('✅ Fixed NextAuth type declarations');

// Fix zod namespace issues
validationFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`Error reading ${filePath}:`, err);
        return;
      }

      let fixedContent = data
        // Fix zod namespace references
        .replace(/z\./g, 'zod.')
        .replace(/Cannot find namespace 'z'/g, '')
        // Add proper zod import if missing
        .replace(/^(?!.*import.*zod)/, 'import { z as zod } from \'zod\';\n');

      // Ensure zod import is at the top
      if (!fixedContent.includes('import { z as zod }') && !fixedContent.includes('import * as zod')) {
        fixedContent = `import { z as zod } from 'zod';\n${fixedContent}`;
      }

      fs.writeFile(filePath, fixedContent, 'utf8', (writeErr) => {
        if (writeErr) {
          console.error(`Error writing ${filePath}:`, writeErr);
        } else {
          console.log(`✅ Fixed zod imports: ${filePath}`);
        }
      });
    });
  }
});

// Fix API route validation errors
const apiRouteFiles = [
  'src/app/api/admin/audit-logs/route.ts',
  'src/app/api/analytics/reports/route.ts',
  'src/app/api/monitoring/audit/route.ts',
  'src/app/api/monitoring/health/route.ts',
  'src/app/api/monitoring/metrics/route.ts'
];

apiRouteFiles.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`Error reading ${filePath}:`, err);
        return;
      }

      let fixedContent = data
        // Fix validation service calls
        .replace(/ValidationService\.getInstance\(\)\.validateRequest\([^)]+\)/g, 'ValidationService.getInstance().validateRequest(request)')
        .replace(/ValidationService\.getInstance\(\)\.validateResponse\([^)]+\)/g, 'ValidationService.getInstance().validateResponse(response)')
        // Fix error handling
        .replace(/error is ZodError/g, 'error instanceof ZodError')
        .replace(/\(error as any\)/g, '(error as Error)')
        // Fix unknown error types
        .replace(/error is of type 'unknown'/g, 'error as Error');

      fs.writeFile(filePath, fixedContent, 'utf8', (writeErr) => {
        if (writeErr) {
          console.error(`Error writing ${filePath}:`, writeErr);
        } else {
          console.log(`✅ Fixed API route validation: ${filePath}`);
        }
      });
    });
  }
});

console.log('✅ Remaining critical error fixes completed!');