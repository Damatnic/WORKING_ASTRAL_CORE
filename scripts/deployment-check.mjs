#!/usr/bin/env node

/**
 * Astral Core V5 - Deployment Readiness Check
 * Comprehensive pre-deployment validation script
 */

import { promises as fs } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

class DeploymentChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.passed = 0;
    this.total = 0;
  }

  check(name, condition, errorMsg, warningMsg = null) {
    this.total++;
    if (condition) {
      log.success(name);
      this.passed++;
    } else if (warningMsg) {
      log.warning(`${name}: ${warningMsg}`);
      this.warnings.push(warningMsg);
      this.passed++; // Warnings don't fail deployment
    } else {
      log.error(`${name}: ${errorMsg}`);
      this.errors.push(errorMsg);
    }
  }

  async checkFile(filePath, description) {
    try {
      await fs.access(path.resolve(projectRoot, filePath));
      this.check(`${description} exists`, true, `${filePath} not found`);
      return true;
    } catch {
      this.check(`${description} exists`, false, `${filePath} not found`);
      return false;
    }
  }

  async checkPackageJson() {
    log.section('📦 Package Configuration');
    
    try {
      const packagePath = path.resolve(projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      
      // Check required scripts
      const requiredScripts = ['build', 'start', 'dev'];
      requiredScripts.forEach(script => {
        this.check(
          `Script '${script}' defined`,
          !!packageJson.scripts?.[script],
          `Missing required script: ${script}`
        );
      });

      // Check dependencies
      const requiredDeps = ['next', 'react', 'react-dom'];
      requiredDeps.forEach(dep => {
        this.check(
          `Dependency '${dep}' present`,
          !!packageJson.dependencies?.[dep],
          `Missing required dependency: ${dep}`
        );
      });

      // Check for production optimization
      this.check(
        'TypeScript configured',
        !!packageJson.devDependencies?.typescript,
        'TypeScript not configured'
      );

      // Check version constraints
      this.check(
        'Next.js version compatible',
        packageJson.dependencies?.next && !packageJson.dependencies.next.includes('canary'),
        'Using canary Next.js version',
        'Consider using stable Next.js version for production'
      );

    } catch (error) {
      this.check('Package.json valid', false, `Failed to read package.json: ${error.message}`);
    }
  }

  async checkNextConfig() {
    log.section('⚙️ Next.js Configuration');
    
    const configExists = await this.checkFile('next.config.mjs', 'Next.js config');
    
    if (configExists) {
      try {
        const configPath = path.resolve(projectRoot, 'next.config.mjs');
        const configContent = await fs.readFile(configPath, 'utf8');
        
        // Check for performance optimizations
        this.check(
          'Bundle optimization enabled',
          configContent.includes('splitChunks') || configContent.includes('optimization'),
          'No bundle optimization found'
        );

        this.check(
          'Image optimization configured',
          configContent.includes('images'),
          'Image optimization not configured'
        );

        this.check(
          'Security headers configured',
          configContent.includes('headers'),
          'Security headers not configured'
        );

        this.check(
          'SWC minification enabled',
          configContent.includes('swcMinify: true'),
          'SWC minification not enabled'
        );

      } catch (error) {
        this.check('Next.js config readable', false, `Failed to read config: ${error.message}`);
      }
    }
  }

  async checkVercelConfig() {
    log.section('🚀 Vercel Configuration');
    
    const configExists = await this.checkFile('vercel.json', 'Vercel config');
    
    if (configExists) {
      try {
        const configPath = path.resolve(projectRoot, 'vercel.json');
        const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
        
        this.check(
          'Functions configuration present',
          !!config.functions,
          'No functions configuration found'
        );

        this.check(
          'Headers configuration present',
          !!config.headers,
          'No headers configuration found'
        );

        this.check(
          'Regions configured',
          !!config.regions,
          'No regions specified',
          'Consider specifying regions for better performance'
        );

      } catch (error) {
        this.check('Vercel config valid', false, `Invalid vercel.json: ${error.message}`);
      }
    } else {
      this.check('Vercel config present', false, 'vercel.json not found - will use defaults');
    }
  }

  async checkEnvironment() {
    log.section('🔐 Environment Configuration');
    
    // Check for environment files
    const envFiles = ['.env', '.env.local', '.env.production'];
    let hasEnvFile = false;
    
    for (const envFile of envFiles) {
      try {
        await fs.access(path.resolve(projectRoot, envFile));
        hasEnvFile = true;
        break;
      } catch {
        // File doesn't exist
      }
    }

    this.check(
      'Environment file present',
      hasEnvFile,
      'No environment files found',
      'Environment variables should be configured in Vercel dashboard'
    );

    // Check for sensitive files that shouldn't be committed
    const sensitiveFiles = ['.env.local', '.env.production.local'];
    for (const file of sensitiveFiles) {
      try {
        await fs.access(path.resolve(projectRoot, file));
        this.check(
          `${file} not committed`,
          false,
          `Sensitive file ${file} might be committed to git`
        );
      } catch {
        // File doesn't exist (good)
        this.check(`${file} properly ignored`, true, '');
      }
    }
  }

  async checkTypeScript() {
    log.section('📝 TypeScript Configuration');
    
    const tsconfigExists = await this.checkFile('tsconfig.json', 'TypeScript config');
    
    if (tsconfigExists) {
      try {
        // Run type check
        log.info('Running TypeScript type check...');
        execSync('npx tsc --noEmit', { 
          cwd: projectRoot, 
          stdio: 'pipe' 
        });
        this.check('TypeScript compilation', true, 'Type errors found');
        
      } catch (error) {
        const output = error.stdout?.toString() || error.message;
        this.check('TypeScript compilation', false, `Type errors: ${output.slice(0, 200)}...`);
      }
    }
  }

  async checkLinting() {
    log.section('🔍 Code Quality');
    
    const eslintExists = await this.checkFile('.eslintrc.json', 'ESLint config');
    
    if (eslintExists) {
      try {
        log.info('Running ESLint...');
        execSync('npx next lint', { 
          cwd: projectRoot, 
          stdio: 'pipe' 
        });
        this.check('ESLint validation', true, 'Linting errors found');
        
      } catch (error) {
        // Check if it's just warnings vs errors
        const output = error.stdout?.toString() || '';
        if (output.includes('warning') && !output.includes('error')) {
          this.check('ESLint validation', true, '', 'ESLint warnings found (non-blocking)');
        } else {
          this.check('ESLint validation', false, 'ESLint errors found');
        }
      }
    }
  }

  async checkCriticalFiles() {
    log.section('📁 Critical Files');
    
    const criticalFiles = [
      { path: 'src/app/layout.tsx', desc: 'Root layout' },
      { path: 'src/app/page.tsx', desc: 'Home page' },
      { path: 'src/app/not-found.tsx', desc: '404 page' },
      { path: 'src/app/loading.tsx', desc: 'Loading page' },
      { path: 'src/app/api/health/route.ts', desc: 'Health check API' },
      { path: 'src/app/api/info/route.ts', desc: 'System info API' },
    ];

    for (const file of criticalFiles) {
      await this.checkFile(file.path, file.desc);
    }
  }

  async checkBuild() {
    log.section('🔨 Build Process');
    
    try {
      log.info('Running production build...');
      execSync('npm run build', { 
        cwd: projectRoot, 
        stdio: 'pipe' 
      });
      this.check('Production build', true, 'Build failed');
      
      // Check if .next directory was created
      try {
        await fs.access(path.resolve(projectRoot, '.next'));
        this.check('Build artifacts created', true, '.next directory not found');
      } catch {
        this.check('Build artifacts created', false, '.next directory not found');
      }
      
    } catch (error) {
      const output = error.stdout?.toString() || error.message;
      this.check('Production build', false, `Build failed: ${output.slice(0, 200)}...`);
    }
  }

  async checkSecurity() {
    log.section('🔒 Security');
    
    // Check for common security issues
    try {
      const packagePath = path.resolve(projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf8'));
      
      // Check for security headers in Next.js config
      try {
        const configPath = path.resolve(projectRoot, 'next.config.mjs');
        const configContent = await fs.readFile(configPath, 'utf8');
        
        const securityHeaders = [
          'X-Frame-Options',
          'X-Content-Type-Options', 
          'Content-Security-Policy'
        ];
        
        securityHeaders.forEach(header => {
          this.check(
            `${header} configured`,
            configContent.includes(header),
            `Security header ${header} not configured`
          );
        });
        
      } catch {
        this.check('Security headers', false, 'Could not verify security headers');
      }
      
    } catch (error) {
      this.check('Security check', false, `Security check failed: ${error.message}`);
    }
  }

  async checkPerformance() {
    log.section('⚡ Performance');
    
    try {
      const configPath = path.resolve(projectRoot, 'next.config.mjs');
      const configContent = await fs.readFile(configPath, 'utf8');
      
      // Check for performance optimizations
      const optimizations = [
        { name: 'Image optimization', check: 'images' },
        { name: 'Bundle splitting', check: 'splitChunks' },
        { name: 'Tree shaking', check: 'usedExports' },
        { name: 'Source maps disabled in prod', check: 'devtool.*source-map' },
      ];
      
      optimizations.forEach(opt => {
        this.check(
          opt.name,
          configContent.includes(opt.check) || new RegExp(opt.check).test(configContent),
          `${opt.name} not configured`,
          `Consider enabling ${opt.name} for better performance`
        );
      });
      
    } catch {
      this.check('Performance config', false, 'Could not verify performance optimizations');
    }
  }

  printSummary() {
    log.section('📊 Deployment Readiness Summary');
    
    console.log(`${colors.bright}Total Checks:${colors.reset} ${this.total}`);
    console.log(`${colors.green}Passed:${colors.reset} ${this.passed}`);
    console.log(`${colors.yellow}Warnings:${colors.reset} ${this.warnings.length}`);
    console.log(`${colors.red}Errors:${colors.reset} ${this.errors.length}`);
    
    const successRate = Math.round((this.passed / this.total) * 100);
    console.log(`${colors.bright}Success Rate:${colors.reset} ${successRate}%`);
    
    if (this.warnings.length > 0) {
      log.section('⚠️ Warnings (Non-blocking)');
      this.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
    
    if (this.errors.length > 0) {
      log.section('❌ Critical Issues');
      this.errors.forEach(error => console.log(`  • ${error}`));
      
      console.log(`\n${colors.red}${colors.bright}❌ DEPLOYMENT NOT READY${colors.reset}`);
      console.log(`Please fix the ${this.errors.length} critical issue(s) above before deploying.\n`);
      process.exit(1);
    } else {
      console.log(`\n${colors.green}${colors.bright}✅ DEPLOYMENT READY${colors.reset}`);
      if (successRate >= 90) {
        console.log(`Excellent! Your application is ready for production deployment.`);
      } else if (successRate >= 80) {
        console.log(`Good! Consider addressing warnings for optimal deployment.`);
      } else {
        console.log(`Deployment is possible but consider addressing warnings.`);
      }
      
      if (this.warnings.length > 0) {
        console.log(`\n${colors.yellow}Note: ${this.warnings.length} non-critical warning(s) found.${colors.reset}`);
      }
      console.log();
    }
  }

  async run() {
    log.section('🚀 Astral Core V5 - Deployment Readiness Check');
    
    await this.checkPackageJson();
    await this.checkNextConfig();
    await this.checkVercelConfig();
    await this.checkEnvironment();
    await this.checkCriticalFiles();
    await this.checkTypeScript();
    await this.checkLinting();
    await this.checkSecurity();
    await this.checkPerformance();
    await this.checkBuild();
    
    this.printSummary();
  }
}

// Run the deployment check
const checker = new DeploymentChecker();
checker.run().catch(error => {
  log.error(`Deployment check failed: ${error.message}`);
  process.exit(1);
});