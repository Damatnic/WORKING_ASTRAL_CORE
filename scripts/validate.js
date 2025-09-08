#!/usr/bin/env node
/**
 * Comprehensive Validation Script
 * Runs all validation checks for the project
 * Windows-compatible
 */

const { execSync, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const os = require('os')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

const log = (message, color = 'reset') => {
  console.log(colors[color] + message + colors.reset)
}

const isWindows = process.platform === 'win32'
const npmCmd = isWindows ? 'npm.cmd' : 'npm'
const npxCmd = isWindows ? 'npx.cmd' : 'npx'

// Validation steps
const validationSteps = [
  {
    name: 'TypeScript Compilation',
    command: `${npxCmd} tsc --noEmit`,
    description: 'Check TypeScript types and compilation',
    required: true,
  },
  {
    name: 'ESLint',
    command: `${npmCmd} run lint`,
    description: 'Check code style and potential issues',
    required: true,
  },
  {
    name: 'Prettier Check',
    command: `${npxCmd} prettier --check "src/**/*.{ts,tsx,js,jsx,json,css,md}"`,
    description: 'Check code formatting',
    required: false,
  },
  {
    name: 'Package Security Audit',
    command: `${npmCmd} audit --audit-level high`,
    description: 'Check for security vulnerabilities',
    required: false,
  },
  {
    name: 'Prisma Schema Validation',
    command: `${npxCmd} prisma validate`,
    description: 'Validate database schema',
    required: true,
  },
  {
    name: 'Next.js Build Check',
    command: `${npmCmd} run build`,
    description: 'Test production build',
    required: true,
    skipInCI: process.env.SKIP_BUILD_VALIDATION === 'true',
  },
  {
    name: 'Unit Tests',
    command: `${npmCmd} run test:ci`,
    description: 'Run unit tests',
    required: true,
    skipInCI: process.argv.includes('--skip-tests'),
  },
]

// Helper functions
const runCommand = (command, { timeout = 120000, silent = false } = {}) => {
  return new Promise((resolve, reject) => {
    if (!silent) {
      log(`Running: ${command}`, 'cyan')
    }
    
    const child = spawn(command, [], {
      shell: true,
      stdio: silent ? 'pipe' : 'inherit',
      timeout,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        FORCE_COLOR: '1',
      },
    })
    
    let output = ''
    
    if (silent) {
      child.stdout?.on('data', (data) => {
        output += data.toString()
      })
      child.stderr?.on('data', (data) => {
        output += data.toString()
      })
    }
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ code, output })
      } else {
        reject({ code, output, command })
      }
    })
    
    child.on('error', (error) => {
      reject({ error, output, command })
    })
  })
}

const checkDependencies = () => {
  log('\n📦 Checking dependencies...', 'blue')
  
  const packageJsonPath = path.join(process.cwd(), 'package.json')
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('package.json not found')
  }
  
  const nodeModulesPath = path.join(process.cwd(), 'node_modules')
  if (!fs.existsSync(nodeModulesPath)) {
    log('Installing dependencies...', 'yellow')
    execSync(`${npmCmd} ci`, { stdio: 'inherit' })
  }
  
  log('✅ Dependencies OK', 'green')
}

const generateValidationReport = (results) => {
  const reportPath = path.join(process.cwd(), 'validation-report.json')
  const report = {
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    nodeVersion: process.version,
    results: results.map(result => ({
      step: result.step.name,
      status: result.success ? 'passed' : 'failed',
      duration: result.duration,
      error: result.error?.message || null,
    })),
    summary: {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      skipped: results.filter(r => r.skipped).length,
    },
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  log(`\n📊 Validation report saved to: ${reportPath}`, 'blue')
  
  return report
}

const main = async () => {
  log('🔍 Starting comprehensive validation...', 'magenta')
  log(`Platform: ${os.platform()} ${os.arch()}`, 'cyan')
  log(`Node.js: ${process.version}`, 'cyan')
  log(`Working directory: ${process.cwd()}`, 'cyan')
  
  const startTime = Date.now()
  const results = []
  let hasRequiredFailures = false
  
  try {
    checkDependencies()
    
    for (const step of validationSteps) {
      const stepStartTime = Date.now()
      
      // Check if step should be skipped
      if (step.skipInCI && process.env.CI) {
        log(`\n⏭️  Skipping ${step.name} (CI environment)`, 'yellow')
        results.push({
          step,
          success: true,
          skipped: true,
          duration: 0,
        })
        continue
      }
      
      log(`\n🔨 ${step.name}`, 'blue')
      log(`   ${step.description}`, 'cyan')
      
      try {
        await runCommand(step.command, { 
          timeout: 300000, // 5 minutes
          silent: false,
        })
        
        const duration = Date.now() - stepStartTime
        log(`✅ ${step.name} completed (${duration}ms)`, 'green')
        
        results.push({
          step,
          success: true,
          skipped: false,
          duration,
        })
        
      } catch (error) {
        const duration = Date.now() - stepStartTime
        
        if (step.required) {
          log(`❌ ${step.name} failed (required)`, 'red')
          hasRequiredFailures = true
        } else {
          log(`⚠️  ${step.name} failed (optional)`, 'yellow')
        }
        
        if (error.output) {
          log(`Output: ${error.output}`, 'red')
        }
        
        results.push({
          step,
          success: false,
          skipped: false,
          duration,
          error,
        })
        
        // Don't exit early, run all validations
      }
    }
    
  } catch (error) {
    log(`\n💥 Validation setup failed: ${error.message}`, 'red')
    process.exit(1)
  }
  
  // Generate report
  const report = generateValidationReport(results)
  
  // Summary
  const totalTime = Date.now() - startTime
  log('\n📋 Validation Summary:', 'magenta')
  log(`   Total time: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`, 'cyan')
  log(`   Passed: ${report.summary.passed}/${report.summary.total}`, 'green')
  
  if (report.summary.failed > 0) {
    log(`   Failed: ${report.summary.failed}/${report.summary.total}`, 'red')
  }
  
  if (report.summary.skipped > 0) {
    log(`   Skipped: ${report.summary.skipped}/${report.summary.total}`, 'yellow')
  }
  
  if (hasRequiredFailures) {
    log('\n❌ Validation failed - required checks did not pass', 'red')
    process.exit(1)
  } else {
    log('\n✅ Validation completed successfully!', 'green')
    process.exit(0)
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n🛑 Validation interrupted', 'yellow')
  process.exit(1)
})

process.on('SIGTERM', () => {
  log('\n🛑 Validation terminated', 'yellow')
  process.exit(1)
})

// Run validation
if (require.main === module) {
  main().catch((error) => {
    log(`\n💥 Validation failed: ${error.message}`, 'red')
    if (error.stack) {
      log(error.stack, 'red')
    }
    process.exit(1)
  })
}

module.exports = { main, runCommand, validationSteps }