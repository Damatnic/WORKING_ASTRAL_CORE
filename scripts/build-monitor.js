#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Build Performance Monitor
 * Tracks build times, memory usage, and error counts
 */
class BuildMonitor {
  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      memoryUsage: {
        initial: process.memoryUsage(),
        peak: process.memoryUsage(),
        final: null
      },
      errors: [],
      warnings: [],
      success: false
    };
    
    this.logFile = path.join(process.cwd(), '.next', 'build-metrics.json');
    this.ensureLogDir();
  }

  ensureLogDir() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  updateMemoryPeak() {
    const current = process.memoryUsage();
    if (current.heapUsed > this.metrics.memoryUsage.peak.heapUsed) {
      this.metrics.memoryUsage.peak = current;
    }
  }

  addError(error) {
    this.metrics.errors.push({
      timestamp: new Date().toISOString(),
      message: error.toString(),
      stack: error.stack
    });
  }

  addWarning(warning) {
    this.metrics.warnings.push({
      timestamp: new Date().toISOString(),
      message: warning.toString()
    });
  }

  finish(success = false) {
    this.metrics.endTime = new Date().toISOString();
    this.metrics.duration = Date.now() - this.startTime;
    this.metrics.memoryUsage.final = process.memoryUsage();
    this.metrics.success = success;
    
    this.saveMetrics();
    this.printSummary();
  }

  saveMetrics() {
    try {
      // Load existing metrics
      let allMetrics = [];
      if (fs.existsSync(this.logFile)) {
        const existing = fs.readFileSync(this.logFile, 'utf8');
        allMetrics = JSON.parse(existing);
      }
      
      // Add current metrics
      allMetrics.push(this.metrics);
      
      // Keep only last 10 builds
      if (allMetrics.length > 10) {
        allMetrics = allMetrics.slice(-10);
      }
      
      fs.writeFileSync(this.logFile, JSON.stringify(allMetrics, null, 2));
    } catch (error) {
      console.warn('Failed to save build metrics:', error.message);
    }
  }

  printSummary() {
    console.log('\n=== BUILD PERFORMANCE SUMMARY ===');
    console.log(`Duration: ${(this.metrics.duration / 1000).toFixed(2)}s`);
    console.log(`Memory Peak: ${(this.metrics.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Success: ${this.metrics.success ? '✅' : '❌'}`);
    console.log(`Errors: ${this.metrics.errors.length}`);
    console.log(`Warnings: ${this.metrics.warnings.length}`);
    
    if (this.metrics.errors.length > 0) {
      console.log('\nErrors:');
      this.metrics.errors.forEach((error, i) => {
        console.log(`  ${i + 1}. ${error.message}`);
      });
    }
    
    console.log('================================\n');
  }

  static getHistoricalMetrics() {
    const logFile = path.join(process.cwd(), '.next', 'build-metrics.json');
    if (!fs.existsSync(logFile)) {
      return [];
    }
    
    try {
      return JSON.parse(fs.readFileSync(logFile, 'utf8'));
    } catch (error) {
      return [];
    }
  }

  static analyzePerformance() {
    const metrics = BuildMonitor.getHistoricalMetrics();
    if (metrics.length === 0) {
      console.log('No historical build data available.');
      return;
    }

    const successful = metrics.filter(m => m.success);
    const failed = metrics.filter(m => !m.success);
    
    console.log('\n=== BUILD PERFORMANCE ANALYSIS ===');
    console.log(`Total Builds: ${metrics.length}`);
    console.log(`Successful: ${successful.length} (${(successful.length / metrics.length * 100).toFixed(1)}%)`);
    console.log(`Failed: ${failed.length} (${(failed.length / metrics.length * 100).toFixed(1)}%)`);
    
    if (successful.length > 0) {
      const avgDuration = successful.reduce((sum, m) => sum + m.duration, 0) / successful.length;
      const avgMemory = successful.reduce((sum, m) => sum + m.memoryUsage.peak.heapUsed, 0) / successful.length;
      
      console.log(`Average Build Time: ${(avgDuration / 1000).toFixed(2)}s`);
      console.log(`Average Memory Usage: ${(avgMemory / 1024 / 1024).toFixed(2)} MB`);
    }
    
    console.log('===================================\n');
  }
}

// Memory monitoring interval
function startMemoryMonitoring(monitor) {
  const interval = setInterval(() => {
    monitor.updateMemoryPeak();
  }, 1000);
  
  return interval;
}

// Main execution
async function runMonitoredBuild(buildCommand) {
  const monitor = new BuildMonitor();
  const memoryInterval = startMemoryMonitoring(monitor);
  
  console.log(`🚀 Starting monitored build: ${buildCommand}`);
  console.log(`📊 Monitoring performance...`);
  
  return new Promise((resolve) => {
    const [command, ...args] = buildCommand.split(' ');
    const buildProcess = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env }
    });
    
    buildProcess.on('error', (error) => {
      monitor.addError(error);
      clearInterval(memoryInterval);
      monitor.finish(false);
      resolve(false);
    });
    
    buildProcess.on('exit', (code) => {
      clearInterval(memoryInterval);
      const success = code === 0;
      
      if (!success) {
        monitor.addError(new Error(`Build failed with exit code ${code}`));
      }
      
      monitor.finish(success);
      resolve(success);
    });
  });
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node build-monitor.js <build-command>');
    console.log('       node build-monitor.js --analyze');
    process.exit(1);
  }
  
  if (args[0] === '--analyze') {
    BuildMonitor.analyzePerformance();
    process.exit(0);
  }
  
  const buildCommand = args.join(' ');
  runMonitoredBuild(buildCommand).then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { BuildMonitor, runMonitoredBuild };