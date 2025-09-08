// Temporary Prisma client export to resolve build issues
// This will be replaced when npm dependencies are properly installed

export class PrismaClient {
  constructor() {
    console.warn('Using temporary PrismaClient stub - please run prisma generate');
  }

  // Add basic stubs for the main models from schema
  user = {
    findUnique: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve(null),
    update: () => Promise.resolve(null),
    delete: () => Promise.resolve(null)
  }

  session = {
    findUnique: () => Promise.resolve(null),
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve(null),
    update: () => Promise.resolve(null),
    delete: () => Promise.resolve(null)
  }

  crisisReport = {
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve(null),
    update: () => Promise.resolve(null)
  }

  safetyPlan = {
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve(null),
    update: () => Promise.resolve(null)
  }

  moodEntry = {
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve(null)
  }

  journalEntry = {
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve(null),
    update: () => Promise.resolve(null)
  }

  supportSession = {
    findMany: () => Promise.resolve([]),
    create: () => Promise.resolve(null),
    update: () => Promise.resolve(null)
  }

  // Add $disconnect method
  $disconnect() {
    return Promise.resolve();
  }

  // Add $connect method
  $connect() {
    return Promise.resolve();
  }
}

export default PrismaClient;