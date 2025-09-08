const crypto = require('crypto');

/**
 * Generate secure encryption keys for Astral Core
 * Run with: node scripts/generate-encryption-keys.js
 */

function generateSecureKey(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateSecureString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

console.log('🔐 Generating Astral Core Encryption Keys');
console.log('========================================\n');

console.log('📋 Add these to your .env file:\n');

// Field-level encryption (PHI data)
console.log('# Field-level PHI encryption (HIPAA compliance)');
console.log(`FIELD_ENCRYPTION_KEY="${generateSecureKey(32)}"`); // 256-bit key
console.log(`FIELD_ENCRYPTION_PEPPER="${generateSecureString(32)}"`);
console.log();

// JWT secrets
console.log('# JWT authentication');
console.log(`JWT_SECRET="${generateSecureString(64)}"`);
console.log(`NEXTAUTH_SECRET="${generateSecureString(32)}"`);
console.log();

// General encryption
console.log('# General encryption');
console.log(`ENCRYPTION_KEY="${generateSecureKey(32)}"`);
console.log(`AUDIT_LOG_KEY="${generateSecureKey(32)}"`);
console.log();

// WebSocket security
console.log('# Real-time features');
console.log(`SOCKET_SECRET="${generateSecureString(32)}"`);
console.log();

console.log('⚠️  SECURITY WARNINGS:');
console.log('===================');
console.log('1. Keep these keys SECRET and NEVER commit them to version control');
console.log('2. Use different keys for development, staging, and production');
console.log('3. Store production keys in secure environment variable systems');
console.log('4. Rotate keys regularly (at least quarterly)');
console.log('5. The FIELD_ENCRYPTION_KEY is especially critical - losing it means');
console.log('   all PHI data becomes unrecoverable');
console.log('6. Consider using a Hardware Security Module (HSM) in production');
console.log();

console.log('💾 Key Backup Strategy:');
console.log('====================');
console.log('1. Store a secure backup of FIELD_ENCRYPTION_KEY in multiple locations');
console.log('2. Use encrypted backup systems with different encryption keys');
console.log('3. Test key recovery procedures regularly');
console.log('4. Consider key escrow for compliance requirements');
console.log();

console.log('🔄 Key Rotation:');
console.log('===============');
console.log('1. Plan key rotation schedule (quarterly recommended)');
console.log('2. Implement gradual migration for encrypted data');
console.log('3. Maintain multiple key versions during transition');
console.log('4. Audit all encryption operations during rotation');

// Additional security recommendations
console.log();
console.log('🛡️  Additional Security Setup:');
console.log('=============================');
console.log('1. Enable database encryption at rest');
console.log('2. Use TLS 1.3 for all connections');
console.log('3. Implement certificate pinning');
console.log('4. Set up WAF (Web Application Firewall)');
console.log('5. Enable CSP (Content Security Policy)');
console.log('6. Configure HSTS headers');
console.log('7. Use secure session storage');
console.log('8. Implement rate limiting');
console.log('9. Set up intrusion detection');
console.log('10. Regular security audits and penetration testing');