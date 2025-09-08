import { PrismaClient } from '@prisma/client';
// import { createEncryptionMiddleware } from './encryption/prisma-middleware';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Create Prisma client with encryption middleware
function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // Enable query logging for debugging encryption
    ...(process.env.NODE_ENV === 'development' && {
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'stdout' },
        { level: 'warn', emit: 'stdout' },
      ],
    }),
  });

  // TODO: Update encryption middleware for Prisma v6 (use client extensions instead of $use)
  // client.$use(createEncryptionMiddleware());

  // Log queries in development for debugging
  // Note: $on is deprecated in Prisma v5+, use $extends for logging instead
  if (process.env.NODE_ENV === 'development') {
    // Prisma v5+ uses extensions for logging
    // Will be implemented when upgrading to latest Prisma version
  }

  return client;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// TODO: Re-enable after updating encryption middleware for Prisma v6
// export { ManualEncryption, ENCRYPTION_FIELD_MAPPINGS } from './encryption/prisma-middleware';
// export { FieldEncryption, PHI_FIELD_TYPES } from './encryption/field-encryption';

export default prisma;

// Health check function
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('Database connection closed gracefully');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
}