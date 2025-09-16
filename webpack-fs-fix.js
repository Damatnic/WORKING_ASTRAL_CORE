// Windows filesystem compatibility fix for webpack readlink issues
// This module patches Node.js fs operations to prevent EISDIR errors

const fs = require('fs');
const path = require('path');

// Store original methods
const originalReadlink = fs.readlink;
const originalReadlinkSync = fs.readlinkSync;
const originalLstat = fs.lstat;
const originalLstatSync = fs.lstatSync;

// Helper function to check if a path is problematic
function isProblematicPath(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.isFile() && filePath.includes('\\src\\app\\');
  } catch (e) {
    return false;
  }
}

// Patch readlink to handle regular files gracefully
fs.readlink = function(filePath, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  if (process.platform === 'win32' && isProblematicPath(filePath)) {
    // Return ENOENT error for regular files to make webpack skip them
    const error = new Error(`ENOENT: no such file or directory, readlink '${filePath}'`);
    error.code = 'ENOENT';
    error.errno = -2;
    error.syscall = 'readlink';
    error.path = filePath;
    
    if (callback) {
      process.nextTick(() => callback(error));
      return;
    }
  }
  
  return originalReadlink.call(this, filePath, options, callback);
};

fs.readlinkSync = function(filePath, options) {
  if (process.platform === 'win32' && isProblematicPath(filePath)) {
    // Throw ENOENT error for regular files to make webpack skip them
    const error = new Error(`ENOENT: no such file or directory, readlink '${filePath}'`);
    error.code = 'ENOENT';
    error.errno = -2;
    error.syscall = 'readlink';
    error.path = filePath;
    throw error;
  }
  
  return originalReadlinkSync.call(this, filePath, options);
};

// Also patch lstat to prevent webpack from thinking files are symlinks
fs.lstat = function(filePath, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  if (process.platform === 'win32' && isProblematicPath(filePath)) {
    // Force return regular file stats
    return fs.stat(filePath, options, callback);
  }
  
  return originalLstat.call(this, filePath, options, callback);
};

fs.lstatSync = function(filePath, options) {
  if (process.platform === 'win32' && isProblematicPath(filePath)) {
    // Force return regular file stats
    return fs.statSync(filePath, options);
  }
  
  return originalLstatSync.call(this, filePath, options);
};

console.log('🔧 Windows filesystem compatibility patch applied');

module.exports = {
  apply: () => {
    console.log('✅ Filesystem patches active for Windows compatibility');
  }
};