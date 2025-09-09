import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prismaClient = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prismaClient;
}

export { prismaClient as prisma };
export default prismaClient;
