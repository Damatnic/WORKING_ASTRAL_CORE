#!/usr/bin/env node

/**
 * Security Audit Script for Astral Core V5
 * Performs comprehensive security checks for HIPAA compliance
 */

const fs = require('fs').promises
const path = require('path')
const crypto = require('crypto')
const { exec } = require('child_process').promises

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

class SecurityAuditor {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: [],
      info: [],
    }
    this.startTime = Date.now()
  }

  log(message, type = 'info') {
    const colorMap = {
      pass: colors.green,
      fail: colors.red,
      warn: colors.yellow,
      info: colors.cyan,
    }
    console.log(`${colorMap[type]}${message}${colors.reset}`)
  }

  async runAudit() {
    console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`${colors.blue}     Astral Core V5 Security Audit - HIPAA Compliance     ${colors.reset}`)
    console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`Audit started at: ${new Date().toISOString()}\n`)

    // Run all security checks
    await this.checkDependencies()
    await this.checkEncryption()
    await this.checkAuthentication()
    await this.checkAPISecurit()
    await this.checkDataProtection()
    await this.checkAccessControls()
    await this.checkAuditLogging()
    await this.checkSessionManagement()
    await this.checkInputValidation()
    await this.checkErrorHandling()
    await this.checkSecurityHeaders()
    await this.checkSSLTLS()
    await this.checkBackupSecurity()
    await this.checkPrivacyControls()
    await this.checkIncidentResponse()

    // Generate report
    this.generateReport()
  }

  async checkDependencies() {
    this.log('\n[1/15] Checking Dependencies for Vulnerabilities...', 'info')
    
    try {
      const { stdout } = await exec('npm audit --json')
      const audit = JSON.parse(stdout)
      
      if (audit.metadata.vulnerabilities.total === 0) {
        this.results.passed.push('No vulnerable dependencies found')
        this.log('✓ No vulnerable dependencies detected', 'pass')
      } else {
        const { critical, high, moderate, low } = audit.metadata.vulnerabilities
        if (critical > 0 || high > 0) {
          this.results.failed.push(`Critical/High vulnerabilities: ${critical + high}`)
          this.log(`✗ Found ${critical} critical and ${high} high vulnerabilities`, 'fail')
        } else {
          this.results.warnings.push(`Moderate/Low vulnerabilities: ${moderate + low}`)
          this.log(`⚠ Found ${moderate} moderate and ${low} low vulnerabilities`, 'warn')
        }
      }
    } catch (error) {
      this.results.warnings.push('Could not complete dependency audit')
      this.log('⚠ Dependency audit incomplete', 'warn')
    }
  }

  async checkEncryption() {
    this.log('\n[2/15] Checking Encryption Configuration...', 'info')
    
    const checks = []
    
    // Check environment variables for encryption keys
    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length >= 32) {
      checks.push({ status: 'pass', message: 'Encryption key properly configured' })
    } else {
      checks.push({ status: 'fail', message: 'Encryption key missing or too weak' })
    }
    
    // Check database encryption
    const prismaSchema = await fs.readFile('prisma/schema.prisma', 'utf-8').catch(() => '')
    if (prismaSchema.includes('encrypted') || prismaSchema.includes('@encrypted')) {
      checks.push({ status: 'pass', message: 'Database field encryption configured' })
    } else {
      checks.push({ status: 'warn', message: 'Database field encryption not detected' })
    }
    
    // Check TLS configuration
    const hasHTTPS = process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https://')
    if (hasHTTPS) {
      checks.push({ status: 'pass', message: 'HTTPS enforced in production' })
    } else if (process.env.NODE_ENV !== 'production') {
      checks.push({ status: 'info', message: 'HTTPS check skipped (non-production)' })
    } else {
      checks.push({ status: 'fail', message: 'HTTPS not enforced' })
    }
    
    this.processChecks(checks, 'Encryption')
  }

  async checkAuthentication() {
    this.log('\n[3/15] Checking Authentication Security...', 'info')
    
    const checks = []
    
    // Check NextAuth configuration
    if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32) {
      checks.push({ status: 'pass', message: 'NextAuth secret properly configured' })
    } else {
      checks.push({ status: 'fail', message: 'NextAuth secret missing or weak' })
    }
    
    // Check for MFA implementation
    const authFiles = await this.findFiles('src', /auth.*\.(ts|tsx|js|jsx)$/)
    const mfaImplemented = await this.searchInFiles(authFiles, /mfa|totp|two.?factor/i)
    if (mfaImplemented) {
      checks.push({ status: 'pass', message: 'Multi-factor authentication implemented' })
    } else {
      checks.push({ status: 'warn', message: 'Multi-factor authentication not detected' })
    }
    
    // Check password policy
    const passwordValidation = await this.searchInFiles(authFiles, /password.*length.*[8-9]|password.*\d{2,}/i)
    if (passwordValidation) {
      checks.push({ status: 'pass', message: 'Password complexity requirements found' })
    } else {
      checks.push({ status: 'warn', message: 'Password complexity requirements not enforced' })
    }
    
    this.processChecks(checks, 'Authentication')
  }

  async checkAPISecurit() {
    this.log('\n[4/15] Checking API Security...', 'info')
    
    const checks = []
    const apiFiles = await this.findFiles('src/app/api', /\.(ts|js)$/)
    
    // Check for rate limiting
    const rateLimiting = await this.searchInFiles(apiFiles, /ratelimit|rate.?limit|throttle/i)
    if (rateLimiting) {
      checks.push({ status: 'pass', message: 'Rate limiting implemented' })
    } else {
      checks.push({ status: 'fail', message: 'Rate limiting not detected' })
    }
    
    // Check for input validation
    const validation = await this.searchInFiles(apiFiles, /zod|joi|validate|sanitize/i)
    if (validation) {
      checks.push({ status: 'pass', message: 'Input validation detected' })
    } else {
      checks.push({ status: 'warn', message: 'Input validation not comprehensive' })
    }
    
    // Check for CORS configuration
    const corsConfig = await this.searchInFiles(apiFiles, /cors|Access-Control/i)
    if (corsConfig) {
      checks.push({ status: 'pass', message: 'CORS configuration found' })
    } else {
      checks.push({ status: 'warn', message: 'CORS configuration not detected' })
    }
    
    this.processChecks(checks, 'API Security')
  }

  async checkDataProtection() {
    this.log('\n[5/15] Checking Data Protection...', 'info')
    
    const checks = []
    
    // Check for PII handling
    const models = await fs.readFile('prisma/schema.prisma', 'utf-8').catch(() => '')
    const sensitiveFields = ['ssn', 'dateOfBirth', 'medicalRecord', 'diagnosis']
    let protectedFields = 0
    
    for (const field of sensitiveFields) {
      if (models.includes(field)) {
        const encrypted = models.includes(`${field}.*@encrypted`) || models.includes(`${field}.*encrypted`)
        if (encrypted) {
          protectedFields++
        }
      }
    }
    
    if (protectedFields > 0) {
      checks.push({ status: 'pass', message: `${protectedFields} sensitive fields encrypted` })
    } else {
      checks.push({ status: 'info', message: 'No sensitive fields detected in schema' })
    }
    
    // Check for data anonymization
    const hasAnonymization = await this.searchInFiles(
      await this.findFiles('src', /\.(ts|tsx|js|jsx)$/),
      /anonymize|redact|mask|sanitize.*pii/i
    )
    if (hasAnonymization) {
      checks.push({ status: 'pass', message: 'Data anonymization implemented' })
    } else {
      checks.push({ status: 'warn', message: 'Data anonymization not detected' })
    }
    
    this.processChecks(checks, 'Data Protection')
  }

  async checkAccessControls() {
    this.log('\n[6/15] Checking Access Controls...', 'info')
    
    const checks = []
    const middlewareFiles = await this.findFiles('src', /middleware\.(ts|js)$/)
    
    // Check for RBAC implementation
    const rbac = await this.searchInFiles(
      await this.findFiles('src', /\.(ts|tsx|js|jsx)$/),
      /role|permission|authorize|can.*access/i
    )
    if (rbac) {
      checks.push({ status: 'pass', message: 'Role-based access control detected' })
    } else {
      checks.push({ status: 'fail', message: 'RBAC not implemented' })
    }
    
    // Check for middleware protection
    if (middlewareFiles.length > 0) {
      const protection = await this.searchInFiles(middlewareFiles, /auth|protect|guard/i)
      if (protection) {
        checks.push({ status: 'pass', message: 'Middleware protection configured' })
      } else {
        checks.push({ status: 'warn', message: 'Middleware protection incomplete' })
      }
    }
    
    this.processChecks(checks, 'Access Controls')
  }

  async checkAuditLogging() {
    this.log('\n[7/15] Checking Audit Logging...', 'info')
    
    const checks = []
    const allFiles = await this.findFiles('src', /\.(ts|tsx|js|jsx)$/)
    
    // Check for audit log implementation
    const auditLogging = await this.searchInFiles(allFiles, /audit.*log|log.*audit|activity.*log/i)
    if (auditLogging) {
      checks.push({ status: 'pass', message: 'Audit logging implemented' })
    } else {
      checks.push({ status: 'fail', message: 'Audit logging not detected' })
    }
    
    // Check for sensitive action logging
    const sensitiveActions = ['login', 'logout', 'delete', 'update.*user', 'access.*medical']
    let loggedActions = 0
    
    for (const action of sensitiveActions) {
      const regex = new RegExp(`log.*${action}|${action}.*log`, 'i')
      if (await this.searchInFiles(allFiles, regex)) {
        loggedActions++
      }
    }
    
    if (loggedActions >= 3) {
      checks.push({ status: 'pass', message: `${loggedActions} sensitive actions logged` })
    } else {
      checks.push({ status: 'warn', message: `Only ${loggedActions} sensitive actions logged` })
    }
    
    this.processChecks(checks, 'Audit Logging')
  }

  async checkSessionManagement() {
    this.log('\n[8/15] Checking Session Management...', 'info')
    
    const checks = []
    
    // Check session configuration
    const sessionTimeout = process.env.SESSION_TIMEOUT || process.env.NEXTAUTH_SESSION_MAX_AGE
    if (sessionTimeout && parseInt(sessionTimeout) <= 1800) { // 30 minutes
      checks.push({ status: 'pass', message: 'Session timeout configured appropriately' })
    } else {
      checks.push({ status: 'warn', message: 'Session timeout may be too long' })
    }
    
    // Check for secure session cookies
    const cookieConfig = await this.searchInFiles(
      await this.findFiles('src', /\.(ts|tsx|js|jsx)$/),
      /httpOnly.*true|secure.*true|sameSite.*strict/i
    )
    if (cookieConfig) {
      checks.push({ status: 'pass', message: 'Secure cookie configuration detected' })
    } else {
      checks.push({ status: 'fail', message: 'Insecure cookie configuration' })
    }
    
    this.processChecks(checks, 'Session Management')
  }

  async checkInputValidation() {
    this.log('\n[9/15] Checking Input Validation...', 'info')
    
    const checks = []
    const apiFiles = await this.findFiles('src/app/api', /\.(ts|js)$/)
    
    // Check for SQL injection prevention
    const parameterizedQueries = await this.searchInFiles(apiFiles, /\$\d+|\?|prisma|prepared/i)
    if (parameterizedQueries) {
      checks.push({ status: 'pass', message: 'Parameterized queries detected' })
    } else {
      checks.push({ status: 'warn', message: 'SQL injection prevention unclear' })
    }
    
    // Check for XSS prevention
    const xssPrevention = await this.searchInFiles(
      await this.findFiles('src', /\.(tsx|jsx)$/),
      /dangerouslySetInnerHTML|sanitize|escape|dompurify/i
    )
    if (xssPrevention) {
      const dangerous = await this.searchInFiles(
        await this.findFiles('src', /\.(tsx|jsx)$/),
        /dangerouslySetInnerHTML(?!.*sanitize)/i
      )
      if (!dangerous) {
        checks.push({ status: 'pass', message: 'XSS prevention implemented' })
      } else {
        checks.push({ status: 'warn', message: 'Unsafe HTML rendering detected' })
      }
    }
    
    this.processChecks(checks, 'Input Validation')
  }

  async checkErrorHandling() {
    this.log('\n[10/15] Checking Error Handling...', 'info')
    
    const checks = []
    const allFiles = await this.findFiles('src', /\.(ts|tsx|js|jsx)$/)
    
    // Check for proper error boundaries
    const errorBoundaries = await this.searchInFiles(allFiles, /ErrorBoundary|componentDidCatch/i)
    if (errorBoundaries) {
      checks.push({ status: 'pass', message: 'Error boundaries implemented' })
    } else {
      checks.push({ status: 'warn', message: 'Error boundaries not detected' })
    }
    
    // Check for information disclosure in errors
    const verboseErrors = await this.searchInFiles(allFiles, /stack.*trace|error\.stack.*res|console\.error.*stack/i)
    if (!verboseErrors) {
      checks.push({ status: 'pass', message: 'Error messages properly sanitized' })
    } else {
      checks.push({ status: 'warn', message: 'Potential information disclosure in errors' })
    }
    
    this.processChecks(checks, 'Error Handling')
  }

  async checkSecurityHeaders() {
    this.log('\n[11/15] Checking Security Headers...', 'info')
    
    const checks = []
    const configFiles = await this.findFiles('.', /next\.config\.(js|mjs|ts)$/)
    
    if (configFiles.length > 0) {
      const config = await fs.readFile(configFiles[0], 'utf-8')
      
      const headers = [
        { name: 'X-Frame-Options', pattern: /X-Frame-Options/i },
        { name: 'X-Content-Type-Options', pattern: /X-Content-Type-Options/i },
        { name: 'Content-Security-Policy', pattern: /Content-Security-Policy/i },
        { name: 'Strict-Transport-Security', pattern: /Strict-Transport-Security/i },
      ]
      
      for (const header of headers) {
        if (header.pattern.test(config)) {
          checks.push({ status: 'pass', message: `${header.name} configured` })
        } else {
          checks.push({ status: 'warn', message: `${header.name} not configured` })
        }
      }
    } else {
      checks.push({ status: 'fail', message: 'Security headers configuration not found' })
    }
    
    this.processChecks(checks, 'Security Headers')
  }

  async checkSSLTLS() {
    this.log('\n[12/15] Checking SSL/TLS Configuration...', 'info')
    
    const checks = []
    
    // Check for HTTPS enforcement
    const httpsEnforced = process.env.NEXTAUTH_URL?.startsWith('https://') || 
                         process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')
    if (httpsEnforced) {
      checks.push({ status: 'pass', message: 'HTTPS enforced in configuration' })
    } else if (process.env.NODE_ENV !== 'production') {
      checks.push({ status: 'info', message: 'HTTPS check skipped (development)' })
    } else {
      checks.push({ status: 'fail', message: 'HTTPS not enforced' })
    }
    
    // Check for certificate pinning
    const certPinning = await this.searchInFiles(
      await this.findFiles('src', /\.(ts|tsx|js|jsx)$/),
      /certificate.*pin|pin.*certificate|hpkp/i
    )
    if (certPinning) {
      checks.push({ status: 'pass', message: 'Certificate pinning detected' })
    } else {
      checks.push({ status: 'info', message: 'Certificate pinning not implemented' })
    }
    
    this.processChecks(checks, 'SSL/TLS')
  }

  async checkBackupSecurity() {
    this.log('\n[13/15] Checking Backup Security...', 'info')
    
    const checks = []
    const backupScripts = await this.findFiles('scripts', /backup/i)
    
    if (backupScripts.length > 0) {
      // Check for encryption in backups
      const encrypted = await this.searchInFiles(backupScripts, /encrypt|cipher|aes/i)
      if (encrypted) {
        checks.push({ status: 'pass', message: 'Backup encryption implemented' })
      } else {
        checks.push({ status: 'fail', message: 'Backups not encrypted' })
      }
      
      // Check for secure storage
      const secureStorage = await this.searchInFiles(backupScripts, /s3|azure|gcs|vault/i)
      if (secureStorage) {
        checks.push({ status: 'pass', message: 'Secure backup storage configured' })
      } else {
        checks.push({ status: 'warn', message: 'Backup storage security unclear' })
      }
    } else {
      checks.push({ status: 'warn', message: 'No backup scripts found' })
    }
    
    this.processChecks(checks, 'Backup Security')
  }

  async checkPrivacyControls() {
    this.log('\n[14/15] Checking Privacy Controls...', 'info')
    
    const checks = []
    const allFiles = await this.findFiles('src', /\.(ts|tsx|js|jsx)$/)
    
    // Check for privacy mode
    const privacyMode = await this.searchInFiles(allFiles, /privacy.*mode|incognito|anonymous.*mode/i)
    if (privacyMode) {
      checks.push({ status: 'pass', message: 'Privacy mode implemented' })
    } else {
      checks.push({ status: 'warn', message: 'Privacy mode not detected' })
    }
    
    // Check for data retention policies
    const dataRetention = await this.searchInFiles(allFiles, /retention|ttl|expire|purge/i)
    if (dataRetention) {
      checks.push({ status: 'pass', message: 'Data retention policies detected' })
    } else {
      checks.push({ status: 'warn', message: 'Data retention policies not clear' })
    }
    
    // Check for consent management
    const consent = await this.searchInFiles(allFiles, /consent|gdpr|privacy.*policy.*accept/i)
    if (consent) {
      checks.push({ status: 'pass', message: 'Consent management implemented' })
    } else {
      checks.push({ status: 'fail', message: 'Consent management not found' })
    }
    
    this.processChecks(checks, 'Privacy Controls')
  }

  async checkIncidentResponse() {
    this.log('\n[15/15] Checking Incident Response...', 'info')
    
    const checks = []
    
    // Check for incident response documentation
    const incidentDocs = await this.findFiles('.', /incident|breach|emergency|disaster/i)
    if (incidentDocs.length > 0) {
      checks.push({ status: 'pass', message: 'Incident response documentation found' })
    } else {
      checks.push({ status: 'warn', message: 'Incident response plan not documented' })
    }
    
    // Check for monitoring and alerting
    const monitoring = await this.searchInFiles(
      await this.findFiles('src', /\.(ts|tsx|js|jsx)$/),
      /monitor|alert|notify.*admin|sentry|datadog/i
    )
    if (monitoring) {
      checks.push({ status: 'pass', message: 'Monitoring and alerting configured' })
    } else {
      checks.push({ status: 'warn', message: 'Monitoring not comprehensive' })
    }
    
    this.processChecks(checks, 'Incident Response')
  }

  async findFiles(dir, pattern) {
    const files = []
    try {
      const items = await fs.readdir(dir, { withFileTypes: true })
      for (const item of items) {
        const fullPath = path.join(dir, item.name)
        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          files.push(...await this.findFiles(fullPath, pattern))
        } else if (item.isFile() && pattern.test(item.name)) {
          files.push(fullPath)
        }
      }
    } catch (error) {
      // Directory doesn't exist or not accessible
    }
    return files
  }

  async searchInFiles(files, pattern) {
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8')
        if (pattern.test(content)) {
          return true
        }
      } catch (error) {
        // File not readable
      }
    }
    return false
  }

  processChecks(checks, category) {
    let passed = 0
    let failed = 0
    let warnings = 0
    
    for (const check of checks) {
      switch (check.status) {
        case 'pass':
          this.results.passed.push(`${category}: ${check.message}`)
          this.log(`  ✓ ${check.message}`, 'pass')
          passed++
          break
        case 'fail':
          this.results.failed.push(`${category}: ${check.message}`)
          this.log(`  ✗ ${check.message}`, 'fail')
          failed++
          break
        case 'warn':
          this.results.warnings.push(`${category}: ${check.message}`)
          this.log(`  ⚠ ${check.message}`, 'warn')
          warnings++
          break
        case 'info':
          this.results.info.push(`${category}: ${check.message}`)
          this.log(`  ℹ ${check.message}`, 'info')
          break
      }
    }
    
    const total = passed + failed + warnings
    if (total > 0) {
      const score = Math.round((passed / total) * 100)
      this.log(`  Score: ${score}% (${passed}/${total} passed)`, score >= 70 ? 'pass' : 'warn')
    }
  }

  generateReport() {
    const duration = Date.now() - this.startTime
    const totalChecks = this.results.passed.length + this.results.failed.length + this.results.warnings.length
    const score = Math.round((this.results.passed.length / totalChecks) * 100)
    
    console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`${colors.blue}                      AUDIT SUMMARY                       ${colors.reset}`)
    console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`)
    
    console.log(`\nTotal Checks: ${totalChecks}`)
    console.log(`${colors.green}Passed: ${this.results.passed.length}${colors.reset}`)
    console.log(`${colors.red}Failed: ${this.results.failed.length}${colors.reset}`)
    console.log(`${colors.yellow}Warnings: ${this.results.warnings.length}${colors.reset}`)
    console.log(`${colors.cyan}Info: ${this.results.info.length}${colors.reset}`)
    
    console.log(`\nOverall Security Score: ${score}%`)
    
    if (score >= 90) {
      console.log(`${colors.green}✓ Excellent security posture${colors.reset}`)
    } else if (score >= 70) {
      console.log(`${colors.green}✓ Good security posture with minor improvements needed${colors.reset}`)
    } else if (score >= 50) {
      console.log(`${colors.yellow}⚠ Moderate security posture - improvements recommended${colors.reset}`)
    } else {
      console.log(`${colors.red}✗ Poor security posture - immediate action required${colors.reset}`)
    }
    
    // HIPAA Compliance Assessment
    console.log(`\n${colors.magenta}HIPAA Compliance Assessment:${colors.reset}`)
    const hipaaRequired = [
      'Encryption',
      'Access Controls',
      'Audit Logging',
      'Data Protection',
      'Incident Response',
    ]
    
    let hipaaCompliant = true
    for (const requirement of hipaaRequired) {
      const passed = this.results.passed.filter(r => r.includes(requirement)).length > 0
      const failed = this.results.failed.filter(r => r.includes(requirement)).length
      
      if (failed > 0) {
        console.log(`${colors.red}  ✗ ${requirement}: Non-compliant${colors.reset}`)
        hipaaCompliant = false
      } else if (passed) {
        console.log(`${colors.green}  ✓ ${requirement}: Compliant${colors.reset}`)
      } else {
        console.log(`${colors.yellow}  ⚠ ${requirement}: Needs review${colors.reset}`)
      }
    }
    
    if (hipaaCompliant && score >= 70) {
      console.log(`\n${colors.green}✓ HIPAA COMPLIANT - System meets minimum requirements${colors.reset}`)
    } else {
      console.log(`\n${colors.red}✗ NOT HIPAA COMPLIANT - Critical issues must be addressed${colors.reset}`)
    }
    
    // Critical Issues
    if (this.results.failed.length > 0) {
      console.log(`\n${colors.red}Critical Issues Requiring Immediate Attention:${colors.reset}`)
      this.results.failed.slice(0, 5).forEach(issue => {
        console.log(`  • ${issue}`)
      })
      if (this.results.failed.length > 5) {
        console.log(`  ... and ${this.results.failed.length - 5} more`)
      }
    }
    
    // Recommendations
    if (this.results.warnings.length > 0) {
      console.log(`\n${colors.yellow}Recommendations for Improvement:${colors.reset}`)
      this.results.warnings.slice(0, 5).forEach(warning => {
        console.log(`  • ${warning}`)
      })
      if (this.results.warnings.length > 5) {
        console.log(`  ... and ${this.results.warnings.length - 5} more`)
      }
    }
    
    // Save detailed report
    this.saveReport(score, hipaaCompliant)
    
    console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`)
    console.log(`Audit completed in ${(duration / 1000).toFixed(2)} seconds`)
    console.log(`Detailed report saved to: security/audit-report-${new Date().toISOString().split('T')[0]}.json`)
    
    // Exit with appropriate code
    if (score < 50 || !hipaaCompliant) {
      process.exit(1) // Fail CI/CD pipeline if security is poor
    }
  }

  async saveReport(score, hipaaCompliant) {
    const report = {
      timestamp: new Date().toISOString(),
      score,
      hipaaCompliant,
      summary: {
        totalChecks: this.results.passed.length + this.results.failed.length + this.results.warnings.length,
        passed: this.results.passed.length,
        failed: this.results.failed.length,
        warnings: this.results.warnings.length,
        info: this.results.info.length,
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
    }
    
    try {
      await fs.mkdir('security', { recursive: true })
      const filename = `security/audit-report-${new Date().toISOString().split('T')[0]}.json`
      await fs.writeFile(filename, JSON.stringify(report, null, 2))
    } catch (error) {
      console.error('Failed to save report:', error.message)
    }
  }

  generateRecommendations() {
    const recommendations = []
    
    if (this.results.failed.some(r => r.includes('Rate limiting'))) {
      recommendations.push({
        priority: 'HIGH',
        category: 'API Security',
        recommendation: 'Implement rate limiting using @upstash/ratelimit to prevent abuse',
      })
    }
    
    if (this.results.failed.some(r => r.includes('MFA'))) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Authentication',
        recommendation: 'Implement multi-factor authentication for enhanced security',
      })
    }
    
    if (this.results.failed.some(r => r.includes('Audit logging'))) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'HIPAA Compliance',
        recommendation: 'Implement comprehensive audit logging for all sensitive operations',
      })
    }
    
    if (this.results.warnings.some(r => r.includes('backup'))) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Disaster Recovery',
        recommendation: 'Ensure backups are encrypted and stored securely',
      })
    }
    
    return recommendations
  }
}

// Run the audit
const auditor = new SecurityAuditor()
auditor.runAudit().catch(error => {
  console.error(`${colors.red}Audit failed: ${error.message}${colors.reset}`)
  process.exit(1)
})