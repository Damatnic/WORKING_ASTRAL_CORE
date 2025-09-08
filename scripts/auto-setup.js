#!/usr/bin/env node

/**
 * Automated Setup Script for AstralCore V5
 * Completes as much setup as possible automatically
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.cyan}${colors.bright}🚀 ${msg}${colors.reset}`),
  manual: (msg) => console.log(`${colors.magenta}👆 MANUAL STEP: ${msg}${colors.reset}`)
};

async function checkPrerequisites() {
  log.step('Checking Prerequisites...');
  
  const checks = [
    { cmd: 'node --version', name: 'Node.js', required: true },
    { cmd: 'npm --version', name: 'NPM', required: true },
    { cmd: 'docker --version', name: 'Docker', required: false },
    { cmd: 'git --version', name: 'Git', required: false }
  ];

  for (const check of checks) {
    try {
      const version = execSync(check.cmd, { encoding: 'utf8' }).trim();
      log.success(`${check.name}: ${version}`);
    } catch (error) {
      if (check.required) {
        log.error(`${check.name} is required but not installed`);
        process.exit(1);
      } else {
        log.warning(`${check.name} not found (optional)`);
      }
    }
  }
}

function generateSecureKeys() {
  log.step('Generating Secure Keys...');
  
  const keys = {
    NEXTAUTH_SECRET: crypto.randomBytes(32).toString('hex'),
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: crypto.randomBytes(16).toString('hex'),
    AUDIT_LOG_KEY: crypto.randomBytes(16).toString('hex'),
    SOCKET_SECRET: crypto.randomBytes(32).toString('hex')
  };

  log.success('Generated all security keys');
  return keys;
}

function createEnvFile(keys) {
  log.step('Creating Environment Configuration...');
  
  const envPath = path.join(process.cwd(), '.env');
  
  // Read existing .env or create new one
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    log.info('Updating existing .env file');
  } else {
    log.info('Creating new .env file');
    envContent = `# AstralCore V5 Environment Variables
# Auto-generated on ${new Date().toISOString()}

`;
  }

  // Define all environment variables with defaults/placeholders
  const envVars = {
    // Database
    DATABASE_URL: envContent.includes('DATABASE_URL=') ? null : '"postgresql://astraluser:secure_password@localhost:5432/astralcore"',
    
    // NextAuth
    NEXTAUTH_URL: envContent.includes('NEXTAUTH_URL=') ? null : '"http://localhost:3000"',
    NEXTAUTH_SECRET: `"${keys.NEXTAUTH_SECRET}"`,
    
    // OAuth (placeholders)
    GOOGLE_CLIENT_ID: envContent.includes('GOOGLE_CLIENT_ID=') ? null : '"your-google-client-id.apps.googleusercontent.com"',
    GOOGLE_CLIENT_SECRET: envContent.includes('GOOGLE_CLIENT_SECRET=') ? null : '"your-google-client-secret"',
    
    // Email (Gmail SMTP placeholders)
    EMAIL_SERVER_HOST: envContent.includes('EMAIL_SERVER_HOST=') ? null : '"smtp.gmail.com"',
    EMAIL_SERVER_PORT: envContent.includes('EMAIL_SERVER_PORT=') ? null : '"587"',
    EMAIL_SERVER_USER: envContent.includes('EMAIL_SERVER_USER=') ? null : '"your.email@gmail.com"',
    EMAIL_SERVER_PASSWORD: envContent.includes('EMAIL_SERVER_PASSWORD=') ? null : '"your-gmail-app-password"',
    EMAIL_FROM: envContent.includes('EMAIL_FROM=') ? null : '"noreply@astralcore.com"',
    
    // Security Keys
    JWT_SECRET: `"${keys.JWT_SECRET}"`,
    ENCRYPTION_KEY: `"${keys.ENCRYPTION_KEY}"`,
    AUDIT_LOG_KEY: `"${keys.AUDIT_LOG_KEY}"`,
    SOCKET_SECRET: `"${keys.SOCKET_SECRET}"`,
    
    // Optional
    REDIS_URL: envContent.includes('REDIS_URL=') ? null : '"redis://localhost:6379"',
    NODE_ENV: envContent.includes('NODE_ENV=') ? null : '"development"',
    
    // Feature Flags
    ENABLE_AI_THERAPY: envContent.includes('ENABLE_AI_THERAPY=') ? null : 'true',
    ENABLE_CRISIS_DETECTION: envContent.includes('ENABLE_CRISIS_DETECTION=') ? null : 'true',
    ENABLE_PEER_SUPPORT: envContent.includes('ENABLE_PEER_SUPPORT=') ? null : 'true'
  };

  // Update or add environment variables
  Object.entries(envVars).forEach(([key, value]) => {
    if (value === null) return; // Skip if already exists
    
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent += `${newLine}\n`;
    }
  });

  fs.writeFileSync(envPath, envContent);
  log.success('Environment file updated');

  // Create .env.example
  const envExamplePath = path.join(process.cwd(), '.env.example');
  const exampleContent = envContent
    .replace(/NEXTAUTH_SECRET="[^"]*"/, 'NEXTAUTH_SECRET="your-nextauth-secret-here"')
    .replace(/JWT_SECRET="[^"]*"/, 'JWT_SECRET="your-jwt-secret-here"')
    .replace(/ENCRYPTION_KEY="[^"]*"/, 'ENCRYPTION_KEY="your-encryption-key-here"')
    .replace(/AUDIT_LOG_KEY="[^"]*"/, 'AUDIT_LOG_KEY="your-audit-log-key-here"')
    .replace(/SOCKET_SECRET="[^"]*"/, 'SOCKET_SECRET="your-socket-secret-here"');
  
  fs.writeFileSync(envExamplePath, exampleContent);
  log.success('Created .env.example file');
}

async function setupDocker() {
  log.step('Setting up Docker Database...');
  
  try {
    // Check if Docker is available
    execSync('docker --version', { stdio: 'ignore' });
    
    // Check if container already exists
    try {
      const containers = execSync('docker ps -a --filter name=astral-postgres --format "{{.Names}}"', { encoding: 'utf8' });
      if (containers.includes('astral-postgres')) {
        log.info('Docker container "astral-postgres" already exists');
        
        // Check if it's running
        const running = execSync('docker ps --filter name=astral-postgres --format "{{.Names}}"', { encoding: 'utf8' });
        if (!running.includes('astral-postgres')) {
          log.info('Starting existing container...');
          execSync('docker start astral-postgres', { stdio: 'inherit' });
        }
        log.success('PostgreSQL container is running');
        return true;
      }
    } catch (error) {
      // Container doesn't exist, create it
    }
    
    log.info('Creating PostgreSQL container...');
    const dockerCommand = `docker run --name astral-postgres -e POSTGRES_DB=astralcore -e POSTGRES_USER=astraluser -e POSTGRES_PASSWORD=secure_password -p 5432:5432 -d postgres:15`;
    
    execSync(dockerCommand, { stdio: 'inherit' });
    
    // Wait for PostgreSQL to be ready
    log.info('Waiting for PostgreSQL to be ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    log.success('PostgreSQL container created and running');
    log.success('Database URL: postgresql://astraluser:secure_password@localhost:5432/astralcore');
    return true;
    
  } catch (error) {
    log.warning('Docker not available or failed to setup');
    log.warning('You\'ll need to set up a database manually');
    return false;
  }
}

function installDependencies() {
  log.step('Installing Dependencies...');
  
  try {
    execSync('npm install', { stdio: 'inherit' });
    log.success('Dependencies installed');
  } catch (error) {
    log.error('Failed to install dependencies');
    throw error;
  }
}

function generatePrismaClient() {
  log.step('Generating Prisma Client...');
  
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    log.success('Prisma client generated');
  } catch (error) {
    log.error('Failed to generate Prisma client');
    throw error;
  }
}

function setupDatabase() {
  log.step('Setting up Database Schema...');
  
  try {
    execSync('npx prisma db push', { stdio: 'inherit' });
    log.success('Database schema created');
    
    log.info('Creating demo users...');
    execSync('node scripts/setup-database.js', { stdio: 'inherit' });
    log.success('Demo users created');
    
  } catch (error) {
    log.error('Failed to setup database. You may need to configure DATABASE_URL first.');
    log.info('Run "npm run db:setup" after configuring your database');
  }
}

function printManualSteps() {
  console.log('\n' + '='.repeat(60));
  log.step('🎯 MANUAL SETUP REQUIRED');
  console.log('='.repeat(60));
  
  console.log('\n📊 Database Setup:');
  console.log('   If Docker setup failed, you need to:');
  console.log('   1. Set up a PostgreSQL database (local or cloud)');
  console.log('   2. Update DATABASE_URL in .env file');
  console.log('   3. Run: npm run db:setup');
  
  console.log('\n🔐 Google OAuth Setup (5 minutes):');
  console.log('   1. Go to: https://console.cloud.google.com');
  console.log('   2. Create/select project');
  console.log('   3. Enable Google+ API (APIs & Services > Library)');
  console.log('   4. Create OAuth 2.0 credentials (Web application)');
  console.log('   5. Add redirect URI: http://localhost:3000/api/auth/callback/google');
  console.log('   6. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
  
  console.log('\n📧 Email Setup (Gmail - 2 minutes):');
  console.log('   1. Enable 2FA on Gmail account');
  console.log('   2. Generate app password: Account > Security > 2-Step > App passwords');
  console.log('   3. Update EMAIL_SERVER_USER and EMAIL_SERVER_PASSWORD in .env');
  
  console.log('\n🚀 Alternative Quick Options:');
  console.log('   Database: https://neon.tech (free PostgreSQL)');
  console.log('   Email: https://resend.com (free email service)');
  
  console.log('\n🧪 Test Accounts (after database setup):');
  console.log('   user@demo.astralcore.com / Demo123!');
  console.log('   helper@demo.astralcore.com / Helper123!');
  console.log('   therapist@demo.astralcore.com / Therapist123!');
  console.log('   crisis@demo.astralcore.com / Crisis123!');
  console.log('   admin@demo.astralcore.com / Admin123!');
  
  console.log('\n🎉 After completing manual steps:');
  console.log('   npm run dev  # Start development server');
  console.log('   Visit: http://localhost:3000/auth/signin');
  
  console.log('\n' + '='.repeat(60));
}

async function main() {
  console.log(`
${colors.cyan}${colors.bright}
  ╔═══════════════════════════════════════╗
  ║         AstralCore V5 Setup           ║
  ║      Automated Installation           ║
  ╚═══════════════════════════════════════╝
${colors.reset}
`);

  try {
    await checkPrerequisites();
    
    const keys = generateSecureKeys();
    createEnvFile(keys);
    
    installDependencies();
    generatePrismaClient();
    
    const dockerSuccess = await setupDocker();
    
    if (dockerSuccess) {
      // Wait a bit more for PostgreSQL to be fully ready
      log.info('Waiting for database to be fully ready...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      setupDatabase();
    }
    
    console.log(`\n${colors.green}${colors.bright}🎉 Automated Setup Complete!${colors.reset}\n`);
    
    printManualSteps();
    
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    console.log('\n💡 Try running individual steps:');
    console.log('   npm run auth:setup  # Generate keys');
    console.log('   npm install         # Install dependencies');
    console.log('   npm run db:setup    # Setup database (after configuring .env)');
    process.exit(1);
  }
}

// Handle cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup interrupted. You can resume by running:');
  console.log('   npm run setup');
  process.exit(0);
});

main().catch(console.error);