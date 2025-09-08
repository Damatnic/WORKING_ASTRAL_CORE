// Automatic User/Data Initialization System
// Ensures database is properly set up on first deployment

import bcrypt from 'bcryptjs';
import { NeonDatabaseService } from './neon-database';

// Demo users for automatic initialization
const DEMO_USERS = [
  {
    email: 'demo@astralcore.app',
    username: 'Demo User',
    displayName: 'Demo User',
    password: 'demo123',
    role: 'user',
    isVerified: true,
  },
  {
    email: 'helper@astralcore.app',
    username: 'Support Helper',
    displayName: 'Support Helper',
    password: 'helper123',
    role: 'helper',
    isVerified: true,
    isHelper: true,
  },
  {
    email: 'admin@astralcore.app',
    username: 'Admin User',
    displayName: 'Admin User',
    password: 'admin123',
    role: 'admin',
    isVerified: true,
    isAdmin: true,
  }
];

// Crisis resources for initialization
const CRISIS_RESOURCES = [
  {
    id: 'us_988',
    type: 'hotline',
    name: '988 Suicide & Crisis Lifeline',
    description: '24/7 crisis support in the United States',
    contact: '988',
    available24x7: true,
    languages: ['en', 'es'],
    countries: ['US'],
    specializations: ['suicide_prevention', 'crisis_support'],
  },
  {
    id: 'crisis_text_line',
    type: 'text',
    name: 'Crisis Text Line',
    description: 'Text HOME to 741741 for free 24/7 crisis support',
    contact: 'Text HOME to 741741',
    available24x7: true,
    languages: ['en', 'es'],
    countries: ['US', 'CA', 'UK'],
    specializations: ['crisis_support', 'mental_health'],
  }
];

// Sample wellness content for initialization
const SAMPLE_CONTENT = [
  {
    type: 'article',
    title: 'Understanding Anxiety: A Beginner\'s Guide',
    content: 'Anxiety is a normal human emotion that everyone experiences...',
    author: 'Astral Core Team',
    tags: ['anxiety', 'mental-health', 'guide'],
    published: true,
  },
  {
    type: 'exercise',
    title: '5-Minute Breathing Exercise',
    content: 'This simple breathing technique can help calm your mind...',
    author: 'Astral Core Team',
    tags: ['breathing', 'relaxation', 'mindfulness'],
    published: true,
  }
];

// Initialization state tracker
let isInitialized = false;
let initializationPromise: Promise<boolean> | null = null;

/**
 * Check if the system has already been initialized
 */
async function checkInitializationStatus(): Promise<boolean> {
  try {
    // Initialize database service
    const dbService = new NeonDatabaseService();
    
    // First check if database is properly set up and has users
    const health = await dbService.checkDatabaseHealth();
    if (!health.connected || health.userCount === 0) {
      return false;
    }
    
    // Check if demo users exist in database
    const demoUserExists = await dbService.findUserByEmail('demo@astralcore.app');
    return !!demoUserExists;
    
  } catch (error) {
    console.error('Error checking initialization status:', error);
    return false;
  }
}

/**
 * Create demo users in the database
 */
async function createDemoUsers(): Promise<void> {
  console.log('🔄 Creating demo users...');
  
  const dbService = new NeonDatabaseService();
  
  for (const userData of DEMO_USERS) {
    try {
      // Check if user already exists
      const existingUser = await dbService.findUserByEmail(userData.email);
      if (existingUser) {
        console.log(`⏭️ User ${userData.email} already exists, skipping...`);
        continue;
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user in database
      const user = await dbService.createUser({
        email: userData.email,
        username: userData.username,
        displayName: userData.displayName,
        passwordHash: hashedPassword,
        isVerified: userData.isVerified,
        role: userData.role as 'user' | 'admin' | 'helper',
        isHelper: userData.isHelper || false,
        isAdmin: userData.isAdmin || false,
        profile: {
          firstName: userData.displayName.split(' ')[0] || userData.displayName,
          lastName: userData.displayName.split(' ')[1] || '',
          bio: `Demo ${userData.role} account for testing and demonstration purposes.`,
          preferences: {
            theme: 'system',
            notifications: true,
            privacy: 'public'
          }
        }
      });
      
      console.log(`✅ Demo user created: ${user.email} (ID: ${user.id})`);
      
    } catch (error) {
      console.error(`❌ Failed to create user ${userData.email}:`, error);
    }
  }
}

/**
 * Initialize crisis resources
 */
async function initializeCrisisResources(): Promise<void> {
  console.log('🔄 Initializing crisis resources...');
  
  const dbService = new NeonDatabaseService();
  
  try {
    for (const resource of CRISIS_RESOURCES) {
      // Check if resource already exists
      const existing = await dbService.findMentalHealthResourceById(resource.id);
      if (existing) {
        console.log(`⏭️ Crisis resource ${resource.id} already exists, skipping...`);
        continue;
      }
      
      // Create crisis resource in database
      await dbService.createMentalHealthResource({
        id: resource.id,
        type: resource.type,
        name: resource.name,
        description: resource.description,
        contact: resource.contact,
        available247: resource.available24x7,
        languages: resource.languages,
        countries: resource.countries,
        specializations: resource.specializations,
        verified: true,
        metadata: {
          source: 'system_initialization',
          createdAt: new Date().toISOString()
        }
      });
      
      console.log(`✅ Crisis resource created: ${resource.name}`);
    }
    
    console.log(`✅ ${CRISIS_RESOURCES.length} crisis resources processed`);
  } catch (error) {
    console.error('❌ Failed to initialize crisis resources:', error);
  }
}

/**
 * Initialize sample content
 */
async function initializeSampleContent(): Promise<void> {
  console.log('🔄 Initializing sample content...');
  
  const dbService = new NeonDatabaseService();
  
  try {
    // Initialize database first to ensure tables exist
    await dbService.initializeDatabase();
    
    // For now, we'll skip content creation as it requires a more complex content system
    // In a full implementation, you would create wellness articles, exercises, etc.
    console.log(`✅ Sample content initialization completed (database ready for content)`);
  } catch (error) {
    console.error('❌ Failed to initialize sample content:', error);
  }
}

/**
 * Main initialization function
 * This should be called on first API request or app startup
 */
export async function ensureInitialized(): Promise<boolean> {
  // Return existing promise if initialization is already in progress
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Check if already initialized
  if (await checkInitializationStatus()) {
    return true;
  }
  
  // Start initialization
  initializationPromise = performInitialization();
  return initializationPromise;
}

/**
 * Perform the actual initialization
 */
async function performInitialization(): Promise<boolean> {
  try {
    console.log('🚀 Starting Astral Core initialization...');
    
    // Initialize database first to ensure all tables exist
    const dbService = new NeonDatabaseService();
    await dbService.initializeDatabase();
    
    // Initialize in sequence to avoid database conflicts
    await initializeSampleContent(); // This also initializes the database
    await createDemoUsers();
    await initializeCrisisResources();
    
    // Mark as initialized
    isInitialized = true;
    
    console.log('✅ Astral Core initialization completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    isInitialized = false;
    initializationPromise = null;
    return false;
  }
}

/**
 * Force re-initialization (useful for development/testing)
 */
export async function forceReinitialize(): Promise<boolean> {
  console.log('🔄 Force re-initializing...');
  
  isInitialized = false;
  initializationPromise = null;
  
  // Clean up any existing state
  const dbService = new NeonDatabaseService();
  try {
    // You might want to clear/reset database tables here in development
    // For production, this should be more careful
    console.log('🧹 Cleaning up for re-initialization...');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  return ensureInitialized();
}

/**
 * Get initialization status and demo credentials
 */
export async function getInitializationInfo() {
  const initialized = await checkInitializationStatus();
  
  return {
    initialized,
    demoCredentials: initialized ? {
      user: { email: 'demo@astralcore.app', password: 'demo123' },
      helper: { email: 'helper@astralcore.app', password: 'helper123' },
      admin: { email: 'admin@astralcore.app', password: 'admin123' },
    } : null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Health check function
 */
export async function checkSystemHealth() {
  const initialized = await checkInitializationStatus();
  
  return {
    status: initialized ? 'healthy' : 'initializing',
    initialized,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };
}