#!/usr/bin/env node

/**
 * Vercel Configuration Validator
 * Validates vercel.json for common issues
 */

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}❌${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
};

async function validateVercelConfig() {
  try {
    log.info('Validating vercel.json configuration...');
    
    const configPath = path.resolve(projectRoot, 'vercel.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    let errors = 0;
    let warnings = 0;
    
    // Validate headers
    if (config.headers) {
      config.headers.forEach((header, index) => {
        // Check source patterns
        if (header.source) {
          const source = header.source;
          
          // Check for common regex issues
          if (source.includes('\\\\')) {
            log.error(`Header ${index}: Double backslashes found in source pattern "${source}"`);
            errors++;
          }
          
          // Check for unescaped special characters
          if (source.includes('(') && !source.includes('\\(')) {
            // This is likely intentional for capture groups
          }
          
          // Check for valid regex pattern
          try {
            new RegExp(source);
            log.success(`Header ${index}: Source pattern "${source}" is valid`);
          } catch (e) {
            log.error(`Header ${index}: Invalid regex pattern "${source}" - ${e.message}`);
            errors++;
          }
        }
        
        // Validate headers array
        if (!header.headers || !Array.isArray(header.headers)) {
          log.error(`Header ${index}: Missing or invalid headers array`);
          errors++;
        } else {
          header.headers.forEach((h, hIndex) => {
            if (!h.key || !h.value) {
              log.error(`Header ${index}.${hIndex}: Missing key or value`);
              errors++;
            }
          });
        }
      });
    }
    
    // Validate functions
    if (config.functions) {
      Object.entries(config.functions).forEach(([path, func]) => {
        if (func.maxDuration && (func.maxDuration < 1 || func.maxDuration > 900)) {
          log.warning(`Function ${path}: maxDuration ${func.maxDuration}s might be invalid (1-900s)`);
          warnings++;
        }
        if (func.memory && ![128, 256, 512, 1024, 2048, 3008].includes(func.memory)) {
          log.warning(`Function ${path}: memory ${func.memory}MB might be invalid`);
          warnings++;
        }
        log.success(`Function ${path}: Configuration valid`);
      });
    }
    
    // Validate redirects
    if (config.redirects) {
      config.redirects.forEach((redirect, index) => {
        if (!redirect.source || !redirect.destination) {
          log.error(`Redirect ${index}: Missing source or destination`);
          errors++;
        } else {
          try {
            new RegExp(redirect.source);
            log.success(`Redirect ${index}: Source pattern valid`);
          } catch (e) {
            log.error(`Redirect ${index}: Invalid source pattern - ${e.message}`);
            errors++;
          }
        }
      });
    }
    
    // Validate rewrites
    if (config.rewrites) {
      config.rewrites.forEach((rewrite, index) => {
        if (!rewrite.source || !rewrite.destination) {
          log.error(`Rewrite ${index}: Missing source or destination`);
          errors++;
        } else {
          log.success(`Rewrite ${index}: Configuration valid`);
        }
      });
    }
    
    // Validate crons
    if (config.crons) {
      config.crons.forEach((cron, index) => {
        if (!cron.path || !cron.schedule) {
          log.error(`Cron ${index}: Missing path or schedule`);
          errors++;
        } else {
          log.success(`Cron ${index}: Configuration valid`);
        }
      });
    }
    
    // Check for common best practices
    const hasSecurityHeaders = config.headers?.some(h => 
      h.headers?.some(header => 
        ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy'].includes(header.key)
      )
    );
    
    if (!hasSecurityHeaders) {
      log.warning('Consider adding security headers (X-Frame-Options, X-Content-Type-Options, etc.)');
      warnings++;
    } else {
      log.success('Security headers configured');
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`${colors.blue}Validation Summary:${colors.reset}`);
    console.log(`${colors.green}✅ Passed: ${config.headers?.length || 0} header rules validated${colors.reset}`);
    
    if (errors > 0) {
      console.log(`${colors.red}❌ Errors: ${errors}${colors.reset}`);
      process.exit(1);
    }
    
    if (warnings > 0) {
      console.log(`${colors.yellow}⚠️ Warnings: ${warnings}${colors.reset}`);
    }
    
    console.log(`${colors.green}🎉 Configuration is valid and ready for deployment!${colors.reset}`);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      log.error('vercel.json not found');
    } else if (error instanceof SyntaxError) {
      log.error(`Invalid JSON in vercel.json: ${error.message}`);
    } else {
      log.error(`Validation failed: ${error.message}`);
    }
    process.exit(1);
  }
}

validateVercelConfig();