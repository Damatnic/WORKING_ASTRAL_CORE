#!/usr/bin/env node

/**
 * Generate secure keys for authentication setup
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Generating secure keys for AstralCore V5...\n');

// Generate keys
const nextAuthSecret = crypto.randomBytes(32).toString('hex');
const jwtSecret = crypto.randomBytes(32).toString('hex');
const encryptionKey = crypto.randomBytes(16).toString('hex'); // 32 characters
const auditLogKey = crypto.randomBytes(16).toString('hex'); // 32 characters
const socketSecret = crypto.randomBytes(32).toString('hex');

console.log('Generated Keys:');
console.log('==============');
console.log(`NEXTAUTH_SECRET="${nextAuthSecret}"`);
console.log(`JWT_SECRET="${jwtSecret}"`);
console.log(`ENCRYPTION_KEY="${encryptionKey}"`);
console.log(`AUDIT_LOG_KEY="${auditLogKey}"`);
console.log(`SOCKET_SECRET="${socketSecret}"`);
console.log('');

// Read existing .env file
const envPath = path.join(process.cwd(), '.env');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  console.log('📝 Updating existing .env file...');
} else {
  console.log('📝 Creating new .env file...');
  envContent = `# AstralCore V5 Environment Variables
# Generated on ${new Date().toISOString()}

# Database
DATABASE_URL="your-database-url-here"

`;
}

// Update or add keys
const keyUpdates = {
  'NEXTAUTH_SECRET': nextAuthSecret,
  'JWT_SECRET': jwtSecret,
  'ENCRYPTION_KEY': encryptionKey,
  'AUDIT_LOG_KEY': auditLogKey,
  'SOCKET_SECRET': socketSecret
};

Object.entries(keyUpdates).forEach(([key, value]) => {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  const newLine = `${key}="${value}"`;
  
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, newLine);
  } else {
    // Add key if it doesn't exist
    if (!envContent.includes(`${key}=`)) {
      envContent += `${newLine}\n`;
    }
  }
});

// Write updated .env file
fs.writeFileSync(envPath, envContent);

console.log('✅ Keys generated and saved to .env file!');
console.log('');
console.log('🔒 Security Notes:');
console.log('- Keep these keys secret and secure');
console.log('- Use different keys for production');
console.log('- Never commit .env file to version control');
console.log('- Rotate keys regularly in production');
console.log('');
console.log('📋 Next Steps:');
console.log('1. Set up your database connection');
console.log('2. Configure OAuth providers (Google, etc.)');
console.log('3. Set up email service (SMTP/SendGrid/Resend)');
console.log('4. Run: npm run db:setup');
console.log('');

// Create .env.example file
const envExample = `# AstralCore V5 Environment Variables
# Copy this file to .env and fill in your actual values

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/astralcore"

# NextAuth.js Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email Provider (Choose one)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your.email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="noreply@astralcore.com"

# Security Keys (Generate with: node scripts/generate-keys.js)
JWT_SECRET="your-jwt-secret-here"
ENCRYPTION_KEY="your-encryption-key-here"
AUDIT_LOG_KEY="your-audit-log-key-here"
SOCKET_SECRET="your-socket-secret-here"

# Optional Services
REDIS_URL="redis://localhost:6379"
SENDGRID_API_KEY="your-sendgrid-api-key"
RESEND_API_KEY="your-resend-api-key"

# AI Services (Optional)
OPENAI_API_KEY="your-openai-api-key"
GEMINI_API_KEY="your-gemini-api-key"

# Feature Flags
NODE_ENV="development"
ENABLE_AI_THERAPY=true
ENABLE_CRISIS_DETECTION=true
ENABLE_PEER_SUPPORT=true
`;

const envExamplePath = path.join(process.cwd(), '.env.example');
fs.writeFileSync(envExamplePath, envExample);

console.log('📄 Created .env.example file for reference');
console.log('');
console.log('🚀 Ready to continue setup!');