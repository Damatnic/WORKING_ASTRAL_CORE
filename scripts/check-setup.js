#!/usr/bin/env node

/**
 * Setup Verification Script
 * Checks if everything is configured correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(status, message, details = '') {
  const icons = { ok: '✅', warn: '⚠️', error: '❌', info: 'ℹ️' };
  const statusColors = { ok: colors.green, warn: colors.yellow, error: colors.red, info: colors.blue };
  
  console.log(`${icons[status]} ${statusColors[status]}${message}${colors.reset}`);
  if (details) {
    console.log(`   ${colors.cyan}${details}${colors.reset}`);
  }
}

function checkEnvironmentFile() {
  console.log(`\n${colors.bright}🔍 Checking Environment Configuration...${colors.reset}`);
  
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    log('error', '.env file not found');
    log('info', 'Run: npm run setup');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  const optionalVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'EMAIL_SERVER_USER',
    'EMAIL_SERVER_PASSWORD'
  ];

  let allRequired = true;
  let hasOptional = 0;

  // Check required variables
  requiredVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=.+`, 'm');
    if (regex.test(envContent)) {
      const value = envContent.match(regex)[0].split('=')[1];
      if (value && value !== '""' && !value.includes('your-') && !value.includes('placeholder')) {
        log('ok', `${varName} configured`);
      } else {
        log('warn', `${varName} needs a real value`);
        allRequired = false;
      }
    } else {
      log('error', `${varName} missing`);
      allRequired = false;
    }
  });

  // Check optional variables
  optionalVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=.+`, 'm');
    if (regex.test(envContent)) {
      const value = envContent.match(regex)[0].split('=')[1];
      if (value && value !== '""' && !value.includes('your-') && !value.includes('placeholder')) {
        log('ok', `${varName} configured`);
        hasOptional++;
      } else {
        log('warn', `${varName} needs configuration for full functionality`);
      }
    } else {
      log('warn', `${varName} not set`);
    }
  });

  console.log(`\n📊 Environment Status: ${allRequired ? 'Core ✅' : 'Needs Work ❌'} | Optional: ${hasOptional}/4 configured`);
  return allRequired;
}

function checkDatabase() {
  console.log(`\n${colors.bright}🗄️ Checking Database Connection...${colors.reset}`);
  
  try {
    // Try to connect to database
    execSync('npx prisma db pull --force', { stdio: 'ignore' });
    log('ok', 'Database connection successful');
    
    // Check if tables exist
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      // Try to query User table
      prisma.user.count().then(count => {
        log('ok', `Database tables exist (${count} users found)`);
      }).catch(() => {
        log('warn', 'Database connected but tables may not exist');
        log('info', 'Run: npm run db:setup');
      }).finally(() => {
        prisma.$disconnect();
      });
      
    } catch (error) {
      log('warn', 'Prisma client not generated');
      log('info', 'Run: npx prisma generate');
    }
    
    return true;
  } catch (error) {
    log('error', 'Database connection failed');
    log('info', 'Check DATABASE_URL in .env file');
    return false;
  }
}

function checkDocker() {
  console.log(`\n${colors.bright}🐳 Checking Docker Setup...${colors.reset}`);
  
  try {
    execSync('docker --version', { stdio: 'ignore' });
    log('ok', 'Docker is installed');
    
    // Check for our container
    try {
      const containers = execSync('docker ps --filter name=astral-postgres --format "{{.Names}}"', { encoding: 'utf8' });
      if (containers.includes('astral-postgres')) {
        log('ok', 'PostgreSQL container is running');
        return true;
      } else {
        const allContainers = execSync('docker ps -a --filter name=astral-postgres --format "{{.Names}}"', { encoding: 'utf8' });
        if (allContainers.includes('astral-postgres')) {
          log('warn', 'PostgreSQL container exists but not running');
          log('info', 'Run: docker start astral-postgres');
        } else {
          log('info', 'PostgreSQL container not found (using external DB?)');
        }
        return false;
      }
    } catch (error) {
      log('info', 'No containers found (using external DB?)');
      return false;
    }
    
  } catch (error) {
    log('info', 'Docker not installed (using external DB?)');
    return false;
  }
}

function checkGoogleOAuth() {
  console.log(`\n${colors.bright}🔐 Checking Google OAuth Setup...${colors.reset}`);
  
  const envPath = path.join(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const clientIdMatch = envContent.match(/^GOOGLE_CLIENT_ID=(.+)$/m);
  const clientSecretMatch = envContent.match(/^GOOGLE_CLIENT_SECRET=(.+)$/m);
  
  if (clientIdMatch && clientSecretMatch) {
    const clientId = clientIdMatch[1].replace(/"/g, '');
    const clientSecret = clientSecretMatch[1].replace(/"/g, '');
    
    if (clientId.includes('your-') || clientSecret.includes('your-')) {
      log('warn', 'Google OAuth not configured');
      log('info', 'Set up at: https://console.cloud.google.com');
      return false;
    } else {
      log('ok', 'Google OAuth credentials configured');
      if (!clientId.endsWith('.apps.googleusercontent.com')) {
        log('warn', 'Client ID format looks incorrect');
      }
      return true;
    }
  } else {
    log('error', 'Google OAuth credentials missing');
    return false;
  }
}

function checkEmailSetup() {
  console.log(`\n${colors.bright}📧 Checking Email Configuration...${colors.reset}`);
  
  const envPath = path.join(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const userMatch = envContent.match(/^EMAIL_SERVER_USER=(.+)$/m);
  const passwordMatch = envContent.match(/^EMAIL_SERVER_PASSWORD=(.+)$/m);
  
  if (userMatch && passwordMatch) {
    const user = userMatch[1].replace(/"/g, '');
    const password = passwordMatch[1].replace(/"/g, '');
    
    if (user.includes('your-') || password.includes('your-')) {
      log('warn', 'Email not configured');
      log('info', 'Configure Gmail app password or use service like Resend');
      return false;
    } else {
      log('ok', 'Email credentials configured');
      if (!user.includes('@')) {
        log('warn', 'Email format looks incorrect');
      }
      return true;
    }
  } else {
    log('warn', 'Email credentials not set');
    return false;
  }
}

function checkNextAuthSetup() {
  console.log(`\n${colors.bright}🔑 Checking NextAuth Configuration...${colors.reset}`);
  
  const authConfigPath = path.join(process.cwd(), 'src', 'lib', 'auth.ts');
  
  if (fs.existsSync(authConfigPath)) {
    log('ok', 'NextAuth configuration file exists');
  } else {
    log('error', 'NextAuth configuration missing');
    return false;
  }
  
  const envPath = path.join(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const secretMatch = envContent.match(/^NEXTAUTH_SECRET=(.+)$/m);
  if (secretMatch) {
    const secret = secretMatch[1].replace(/"/g, '');
    if (secret.length >= 32) {
      log('ok', 'NextAuth secret is strong');
    } else {
      log('warn', 'NextAuth secret should be at least 32 characters');
    }
  } else {
    log('error', 'NEXTAUTH_SECRET missing');
    return false;
  }
  
  return true;
}

function checkPrisma() {
  console.log(`\n${colors.bright}🔄 Checking Prisma Setup...${colors.reset}`);
  
  const clientPath = path.join(process.cwd(), 'src', 'generated', 'prisma');
  
  if (fs.existsSync(clientPath)) {
    log('ok', 'Prisma client generated');
  } else {
    log('error', 'Prisma client not generated');
    log('info', 'Run: npx prisma generate');
    return false;
  }
  
  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
  if (fs.existsSync(schemaPath)) {
    log('ok', 'Prisma schema exists');
  } else {
    log('error', 'Prisma schema missing');
    return false;
  }
  
  return true;
}

function provideFinalGuidance(results) {
  console.log(`\n${colors.bright}${colors.cyan}📋 SETUP STATUS SUMMARY${colors.reset}`);
  console.log('='.repeat(50));
  
  const overallScore = Object.values(results).filter(Boolean).length;
  const totalChecks = Object.keys(results).length;
  
  console.log(`Overall Progress: ${overallScore}/${totalChecks} components ready`);
  
  if (results.env && results.database && results.nextauth && results.prisma) {
    console.log(`\n${colors.green}🎉 READY TO START DEVELOPMENT!${colors.reset}`);
    console.log(`   Run: ${colors.cyan}npm run dev${colors.reset}`);
    console.log(`   Visit: ${colors.cyan}http://localhost:3000/auth/signin${colors.reset}`);
    
    if (!results.oauth) {
      console.log(`\n${colors.yellow}⚠️ Google OAuth not configured${colors.reset}`);
      console.log('   Users can only sign in with email/password');
    }
    
    if (!results.email) {
      console.log(`\n${colors.yellow}⚠️ Email not configured${colors.reset}`);
      console.log('   Password reset and verification emails won\'t work');
    }
    
  } else {
    console.log(`\n${colors.yellow}🔧 STILL NEEDS SETUP${colors.reset}`);
    
    if (!results.env) {
      console.log('   1. Configure environment variables');
    }
    if (!results.database) {
      console.log('   2. Set up database connection');
      console.log('      Run: npm run db:setup');
    }
    if (!results.prisma) {
      console.log('   3. Generate Prisma client');
      console.log('      Run: npx prisma generate');
    }
    if (!results.oauth) {
      console.log('   4. Set up Google OAuth (optional but recommended)');
    }
    if (!results.email) {
      console.log('   5. Configure email service (for password reset)');
    }
  }
  
  console.log(`\n${colors.blue}💡 Quick Setup Commands:${colors.reset}`);
  console.log('   npm run setup       # Auto-setup what\'s possible');
  console.log('   npm run auth:setup  # Generate security keys');
  console.log('   npm run db:setup    # Initialize database');
  console.log('   npm run check       # Run this check again');
  
  console.log('\n📚 Guides:');
  console.log('   QUICK-START.md  # 15-minute setup guide');
  console.log('   SETUP-AUTH.md   # Detailed setup instructions');
}

async function main() {
  console.log(`
${colors.cyan}${colors.bright}
  ╔═════════════════════════════════════╗
  ║       AstralCore V5 Setup Check     ║
  ║      Verification & Diagnostics     ║
  ╚═════════════════════════════════════╝
${colors.reset}
`);

  const results = {
    env: checkEnvironmentFile(),
    prisma: checkPrisma(),
    database: checkDatabase(),
    docker: checkDocker(),
    nextauth: checkNextAuthSetup(),
    oauth: checkGoogleOAuth(),
    email: checkEmailSetup()
  };

  provideFinalGuidance(results);
}

main().catch(console.error);