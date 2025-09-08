#!/usr/bin/env node

/**
 * Health check script for Docker container
 * Verifies that the application is running and responsive
 */

const http = require('http')

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  timeout: 2000,
}

const request = http.get(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0) // Healthy
  } else {
    process.exit(1) // Unhealthy
  }
})

request.on('error', (err) => {
  console.error('Health check failed:', err)
  process.exit(1) // Unhealthy
})

request.on('timeout', () => {
  console.error('Health check timeout')
  request.destroy()
  process.exit(1) // Unhealthy
})

request.setTimeout(options.timeout)