#!/usr/bin/env node
/**
 * Pre-commit Hooks
 * Validates code before commits
 * Windows-compatible
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

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

// Get staged files
const getStagedFiles = () => {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', { 
      encoding: 'utf8',
      cwd: process.cwd(),
    })
    return output.trim().split('\n').filter(file => file.length > 0)
  } catch (error) {
    log('Warning: Could not get staged files', 'yellow')
    return []
  }
}

// Get TypeScript/JavaScript files from staged files
const getCodeFiles = (files) => {
  return files.filter(file => /\.(ts|tsx|js|jsx)$/.test(file))
}

// Get all files that need formatting
const getFormattableFiles = (files) => {
  return files.filter(file => /\.(ts|tsx|js|jsx|json|css|md)$/.test(file))
}

// Check if file exists and is readable
const fileExists = (filePath) => {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile()
  } catch {
    return false
  }
}

// Validate TypeScript files
const validateTypeScript = async (files) => {
  if (files.length === 0) return true
  
  log('\n🔍 Checking TypeScript...', 'blue')
  
  try {
    execSync(`${npxCmd} tsc --noEmit --incremental false`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    log('✅ TypeScript validation passed', 'green')
    return true
  } catch (error) {
    log('❌ TypeScript validation failed', 'red')
    return false
  }
}

// Run ESLint on staged files
const runESLint = async (files) => {
  if (files.length === 0) return true
  
  log('\n🔍 Running ESLint...', 'blue')
  
  // Filter out files that don't exist
  const existingFiles = files.filter(fileExists)
  
  if (existingFiles.length === 0) {
    log('⏭️  No files to lint', 'yellow')
    return true
  }
  
  try {
    const fileList = existingFiles.map(f => `"${f}"`).join(' ')
    execSync(`${npxCmd} eslint ${fileList} --max-warnings 0`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    log('✅ ESLint passed', 'green')
    return true
  } catch (error) {
    log('❌ ESLint failed', 'red')
    log('Hint: Run `npm run lint:fix` to auto-fix some issues', 'yellow')
    return false
  }
}

// Check code formatting with Prettier
const checkPrettier = async (files) => {
  if (files.length === 0) return true
  
  log('\n🎨 Checking code formatting...', 'blue')
  
  // Filter out files that don't exist
  const existingFiles = files.filter(fileExists)
  
  if (existingFiles.length === 0) {
    log('⏭️  No files to format check', 'yellow')
    return true
  }
  
  try {
    const fileList = existingFiles.map(f => `"${f}"`).join(' ')
    execSync(`${npxCmd} prettier --check ${fileList}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    log('✅ Code formatting is correct', 'green')
    return true
  } catch (error) {
    log('❌ Code formatting issues found', 'red')
    log('Hint: Run `npm run format` to fix formatting', 'yellow')
    return false
  }
}

// Run tests related to staged files
const runRelatedTests = async (files) => {
  if (files.length === 0) return true
  
  log('\n🧪 Running related tests...', 'blue')
  
  try {
    execSync(`${npmCmd} run test -- --passWithNoTests --findRelatedTests ${files.join(' ')}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
    })
    log('✅ Tests passed', 'green')
    return true
  } catch (error) {
    log('❌ Tests failed', 'red')
    return false
  }
}

// Check for common issues
const checkForIssues = (files) => {
  log('\n🔍 Checking for common issues...', 'blue')
  
  let hasIssues = false
  
  for (const file of files) {
    if (!fileExists(file)) continue
    
    try {
      const content = fs.readFileSync(file, 'utf8')
      
      // Check for console.log statements (except in specific files)
      if (!file.includes('scripts/') && !file.includes('.test.') && !file.includes('.spec.')) {
        const consoleMatches = content.match(/console\.(log|debug|info)\(/g)
        if (consoleMatches) {
          log(`⚠️  Found console statements in ${file}:`, 'yellow')
          consoleMatches.forEach(match => {
            log(`     ${match}`, 'yellow')
          })
          hasIssues = true
        }
      }
      
      // Check for TODO/FIXME comments
      const todoMatches = content.match(/\/\/\s*(TODO|FIXME|HACK)\b/gi)
      if (todoMatches) {
        log(`📝 Found TODO/FIXME comments in ${file}:`, 'cyan')
        todoMatches.forEach(match => {
          log(`     ${match}`, 'cyan')
        })
      }
      
      // Check for debugger statements
      if (content.includes('debugger;')) {
        log(`❌ Found debugger statement in ${file}`, 'red')
        hasIssues = true
      }
      
      // Check for large files (>500 lines)
      const lineCount = content.split('\n').length
      if (lineCount > 500) {
        log(`📊 Large file detected: ${file} (${lineCount} lines)`, 'yellow')
      }
      
    } catch (error) {
      log(`⚠️  Could not read ${file}: ${error.message}`, 'yellow')
    }
  }
  
  if (!hasIssues) {
    log('✅ No issues found', 'green')
  }
  
  return !hasIssues
}

// Main pre-commit validation
const main = async () => {
  log('🔀 Starting pre-commit validation...', 'magenta')
  
  const stagedFiles = getStagedFiles()
  if (stagedFiles.length === 0) {
    log('No staged files found', 'yellow')
    return true
  }
  
  log(`Found ${stagedFiles.length} staged files:`, 'cyan')
  stagedFiles.forEach(file => log(`  ${file}`, 'cyan'))
  
  const codeFiles = getCodeFiles(stagedFiles)
  const formattableFiles = getFormattableFiles(stagedFiles)
  
  const validations = []
  
  // Run TypeScript validation
  if (codeFiles.length > 0) {
    validations.push(validateTypeScript(codeFiles))
  }
  
  // Run ESLint
  if (codeFiles.length > 0) {
    validations.push(runESLint(codeFiles))
  }
  
  // Check Prettier formatting
  if (formattableFiles.length > 0) {
    validations.push(checkPrettier(formattableFiles))
  }
  
  // Check for common issues
  if (codeFiles.length > 0) {
    validations.push(checkForIssues(codeFiles))
  }
  
  // Run related tests (if not in CI to save time)
  if (!process.env.CI && codeFiles.length > 0) {
    validations.push(runRelatedTests(codeFiles))
  }
  
  const results = await Promise.all(validations)
  const success = results.every(result => result === true)
  
  if (success) {
    log('\n✅ Pre-commit validation passed!', 'green')
    return true
  } else {
    log('\n❌ Pre-commit validation failed!', 'red')
    log('Please fix the issues above before committing.', 'red')
    return false
  }
}

// Install pre-commit hook
const installHook = () => {
  const gitHooksDir = path.join(process.cwd(), '.git', 'hooks')
  const preCommitHookPath = path.join(gitHooksDir, 'pre-commit')
  
  if (!fs.existsSync(gitHooksDir)) {
    log('Not a git repository', 'red')
    return false
  }
  
  const hookContent = `#!/bin/sh
# Pre-commit hook for AstralCore
node scripts/pre-commit-hooks.js
`
  
  try {
    fs.writeFileSync(preCommitHookPath, hookContent, { mode: 0o755 })
    log('✅ Pre-commit hook installed', 'green')
    return true
  } catch (error) {
    log(`❌ Failed to install pre-commit hook: ${error.message}`, 'red')
    return false
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.includes('--install')) {
    installHook()
  } else {
    main().then(success => {
      process.exit(success ? 0 : 1)
    }).catch(error => {
      log(`\n💥 Pre-commit validation error: ${error.message}`, 'red')
      process.exit(1)
    })
  }
}

module.exports = { main, installHook }