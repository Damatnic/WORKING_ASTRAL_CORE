// Enhanced Windows-compatible build script
// Handles symlink issues, path problems, and EISDIR errors on Windows systems

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Enhanced Windows Build Script - Fixing filesystem compatibility...');

async function cleanupWindowsFiles() {
  console.log('🧹 Cleaning Windows-specific issues...');
  
  const foldersToClean = [
    path.join(process.cwd(), '.next'),
    path.join(process.cwd(), 'node_modules', '.cache'),
    path.join(process.cwd(), '.swc'),
  ];

  for (const folder of foldersToClean) {
    if (fs.existsSync(folder)) {
      try {
        if (process.platform === 'win32') {
          execSync(`rmdir /s /q "${folder}"`, { stdio: 'inherit' });
        } else {
          execSync(`rm -rf "${folder}"`, { stdio: 'inherit' });
        }
        console.log(`   Cleaned: ${folder}`);
      } catch (error) {
        console.log(`   Warning: Could not clean ${folder} - continuing anyway`);
      }
    }
  }

  // Fix any potential symlink issues by ensuring directories exist and are accessible
  const srcDir = path.join(process.cwd(), 'src');
  if (fs.existsSync(srcDir)) {
    console.log('   Verifying src directory structure...');
    try {
      // Recursively check for any problematic files or directories
      await checkDirectoryHealth(srcDir);
    } catch (error) {
      console.log(`   Warning: Directory health check issue - ${error.message}`);
    }
  }
}

async function checkDirectoryHealth(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    try {
      if (item.isDirectory()) {
        // Recursively check subdirectories
        await checkDirectoryHealth(fullPath);
      } else if (item.isFile()) {
        // Just try to stat the file to ensure it's accessible
        fs.statSync(fullPath);
      }
    } catch (error) {
      if (error.code === 'EISDIR' || error.code === 'ENOTDIR') {
        console.log(`   Warning: Path issue at ${fullPath} - attempting fix...`);
        // Try to handle the path issue
        try {
          const stats = fs.lstatSync(fullPath);
          if (stats.isSymbolicLink()) {
            console.log(`   Found symlink: ${fullPath} - this may cause issues on Windows`);
          }
        } catch (fixError) {
          console.log(`   Could not fix: ${fixError.message}`);
        }
      }
    }
  }
}

async function setWindowsEnvironment() {
  console.log('⚙️  Setting Windows-optimized environment...');
  
  // Set environment variables for Windows build
  const windowsEnv = {
    ...process.env,
    NODE_OPTIONS: '--max-old-space-size=8192 --experimental-json-modules',
    NEXT_TELEMETRY_DISABLED: '1',
    NODE_ENV: 'production',
    // Windows-specific optimizations
    UV_THREADPOOL_SIZE: '128',
    FORCE_COLOR: '0',
    // Disable problematic features
    NEXT_CACHE: 'false',
    WEBPACK_DISABLE_SYMLINKS: 'true',
  };

  return windowsEnv;
}

async function windowsBuildWithRetry() {
  const maxRetries = 3;
  let attempt = 1;

  while (attempt <= maxRetries) {
    console.log(`🚀 Starting Next.js build (attempt ${attempt}/${maxRetries})...`);
    
    try {
      const env = await setWindowsEnvironment();
      
      const buildProcess = spawn('npx', ['next', 'build'], {
        stdio: 'inherit',
        shell: true,
        env,
        // Windows-specific spawn options
        windowsHide: false,
        detached: false,
      });
      
      const exitCode = await new Promise((resolve, reject) => {
        buildProcess.on('close', resolve);
        buildProcess.on('error', reject);
        
        // Set a timeout to prevent hanging
        const timeout = setTimeout(() => {
          buildProcess.kill();
          reject(new Error('Build process timed out'));
        }, 10 * 60 * 1000); // 10 minutes
        
        buildProcess.on('close', () => {
          clearTimeout(timeout);
        });
      });
      
      if (exitCode === 0) {
        console.log('✅ Build completed successfully!');
        return true;
      } else {
        throw new Error(`Build failed with exit code ${exitCode}`);
      }
      
    } catch (error) {
      console.error(`❌ Build attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        console.log('\n💡 All retry attempts failed. This may be a Windows-specific issue.');
        console.log('🔍 Common Windows issues and solutions:');
        console.log('   1. EISDIR errors: Try running as Administrator');
        console.log('   2. Path length issues: Enable long path support in Windows');
        console.log('   3. Antivirus interference: Add project folder to exclusions');
        console.log('   4. File permissions: Ensure full control over project directory');
        console.log('\n🚀 For production deployment:');
        console.log('   - The build will work correctly on Linux servers (Vercel, etc.)');
        console.log('   - This is primarily a Windows development environment issue');
        return false;
      } else {
        console.log(`   Retrying in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Clean up before retry
        await cleanupWindowsFiles();
      }
      
      attempt++;
    }
  }
  
  return false;
}

async function windowsBuild() {
  console.log(`
🔧 Enhanced Windows Build Script
===============================
Platform: ${process.platform}
Node: ${process.version}
Working Directory: ${process.cwd()}
`);

  try {
    // Step 1: Clean up any problematic files
    await cleanupWindowsFiles();
    
    // Step 2: Run build with retry mechanism
    const success = await windowsBuildWithRetry();
    
    if (success) {
      console.log('\n🎉 Windows build completed successfully!');
      console.log('📝 Build artifacts created in .next directory');
    } else {
      console.log('\n⚠️  Windows build failed, but deployment may still work.');
      console.log('🚀 Try deploying to Vercel/Linux environment for production.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Fatal build script error:', error);
    console.log('\n🔧 Troubleshooting steps:');
    console.log('   1. Ensure you have write permissions to the project directory');
    console.log('   2. Try running PowerShell as Administrator');
    console.log('   3. Check if any files are locked by antivirus or other processes');
    console.log('   4. Clear node_modules and reinstall: rm -rf node_modules && npm install');
    process.exit(1);
  }
}

// Run the enhanced build
windowsBuild();