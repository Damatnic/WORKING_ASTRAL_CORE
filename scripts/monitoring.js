#!/usr/bin/env node

/**
 * Monitoring and Observability Setup for Astral Core V5
 * Implements comprehensive monitoring for mental health platform
 */

const { createLogger, format, transports } = require('winston')
const prometheus = require('prom-client')
const { StatsD } = require('node-statsd')

// Initialize Prometheus metrics registry
const register = new prometheus.Registry()

// Configure structured logging
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: {
    service: 'astralcore',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || 'unknown',
  },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      ),
    }),
    new transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    new transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
  ],
})

// StatsD client for metrics
const statsd = new StatsD({
  host: process.env.STATSD_HOST || 'localhost',
  port: process.env.STATSD_PORT || 8125,
  prefix: 'astralcore.',
  cacheDns: true,
})

// Custom Metrics for Mental Health Platform
class AstralCoreMetrics {
  constructor() {
    this.setupMetrics()
    this.setupHealthChecks()
    this.setupCrisisMetrics()
    this.setupPerformanceMetrics()
    this.setupSecurityMetrics()
    this.setupBusinessMetrics()
  }

  setupMetrics() {
    // HTTP Request metrics
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5],
    })
    register.registerMetric(this.httpRequestDuration)

    // Active users gauge
    this.activeUsers = new prometheus.Gauge({
      name: 'active_users_total',
      help: 'Total number of active users',
      labelNames: ['type'],
    })
    register.registerMetric(this.activeUsers)

    // Database connection pool
    this.dbConnectionPool = new prometheus.Gauge({
      name: 'database_connection_pool_size',
      help: 'Database connection pool metrics',
      labelNames: ['state'],
    })
    register.registerMetric(this.dbConnectionPool)

    // Memory usage
    this.memoryUsage = new prometheus.Gauge({
      name: 'nodejs_memory_usage_bytes',
      help: 'Node.js memory usage',
      labelNames: ['type'],
    })
    register.registerMetric(this.memoryUsage)
  }

  setupHealthChecks() {
    // Application health status
    this.healthStatus = new prometheus.Gauge({
      name: 'app_health_status',
      help: 'Application health status (1 = healthy, 0 = unhealthy)',
      labelNames: ['component'],
    })
    register.registerMetric(this.healthStatus)

    // Dependency health checks
    this.dependencyHealth = new prometheus.Gauge({
      name: 'dependency_health_status',
      help: 'External dependency health status',
      labelNames: ['service'],
    })
    register.registerMetric(this.dependencyHealth)
  }

  setupCrisisMetrics() {
    // Crisis intervention metrics
    this.crisisInterventions = new prometheus.Counter({
      name: 'crisis_interventions_total',
      help: 'Total number of crisis interventions',
      labelNames: ['type', 'outcome'],
    })
    register.registerMetric(this.crisisInterventions)

    // Crisis response time
    this.crisisResponseTime = new prometheus.Histogram({
      name: 'crisis_response_time_seconds',
      help: 'Time to connect user with crisis support',
      labelNames: ['channel'],
      buckets: [1, 5, 10, 30, 60],
    })
    register.registerMetric(this.crisisResponseTime)

    // Risk assessments
    this.riskAssessments = new prometheus.Counter({
      name: 'risk_assessments_total',
      help: 'Total number of risk assessments performed',
      labelNames: ['risk_level', 'action_taken'],
    })
    register.registerMetric(this.riskAssessments)
  }

  setupPerformanceMetrics() {
    // API latency
    this.apiLatency = new prometheus.Summary({
      name: 'api_latency_seconds',
      help: 'API endpoint latency',
      labelNames: ['endpoint', 'method'],
      percentiles: [0.5, 0.9, 0.95, 0.99],
    })
    register.registerMetric(this.apiLatency)

    // Database query performance
    this.dbQueryDuration = new prometheus.Histogram({
      name: 'database_query_duration_seconds',
      help: 'Database query execution time',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 5],
    })
    register.registerMetric(this.dbQueryDuration)

    // Cache hit ratio
    this.cacheHitRatio = new prometheus.Gauge({
      name: 'cache_hit_ratio',
      help: 'Cache hit ratio',
      labelNames: ['cache_type'],
    })
    register.registerMetric(this.cacheHitRatio)
  }

  setupSecurityMetrics() {
    // Failed login attempts
    this.failedLogins = new prometheus.Counter({
      name: 'failed_login_attempts_total',
      help: 'Total number of failed login attempts',
      labelNames: ['reason'],
    })
    register.registerMetric(this.failedLogins)

    // Security events
    this.securityEvents = new prometheus.Counter({
      name: 'security_events_total',
      help: 'Security events detected',
      labelNames: ['type', 'severity'],
    })
    register.registerMetric(this.securityEvents)

    // Encryption operations
    this.encryptionOps = new prometheus.Counter({
      name: 'encryption_operations_total',
      help: 'Total encryption/decryption operations',
      labelNames: ['operation', 'algorithm'],
    })
    register.registerMetric(this.encryptionOps)
  }

  setupBusinessMetrics() {
    // User engagement
    this.userEngagement = new prometheus.Gauge({
      name: 'user_engagement_score',
      help: 'User engagement metrics',
      labelNames: ['metric_type'],
    })
    register.registerMetric(this.userEngagement)

    // Feature usage
    this.featureUsage = new prometheus.Counter({
      name: 'feature_usage_total',
      help: 'Feature usage statistics',
      labelNames: ['feature', 'user_segment'],
    })
    register.registerMetric(this.featureUsage)

    // Therapy sessions
    this.therapySessions = new prometheus.Counter({
      name: 'therapy_sessions_total',
      help: 'Total therapy sessions',
      labelNames: ['type', 'completion_status'],
    })
    register.registerMetric(this.therapySessions)

    // Wellness activities
    this.wellnessActivities = new prometheus.Counter({
      name: 'wellness_activities_total',
      help: 'Wellness activities completed',
      labelNames: ['activity_type', 'duration_category'],
    })
    register.registerMetric(this.wellnessActivities)
  }

  // Track HTTP request
  trackHttpRequest(method, route, statusCode, duration) {
    this.httpRequestDuration.observe(
      { method, route, status_code: statusCode },
      duration
    )
    statsd.timing(`http.request.${method}.${statusCode}`, duration * 1000)
  }

  // Track crisis intervention
  trackCrisisIntervention(type, outcome, responseTime) {
    this.crisisInterventions.inc({ type, outcome })
    this.crisisResponseTime.observe({ channel: type }, responseTime)
    statsd.increment(`crisis.intervention.${type}.${outcome}`)
    
    // Alert if response time is too high
    if (responseTime > 30) {
      logger.error('Crisis response time exceeded threshold', {
        type,
        responseTime,
        threshold: 30,
      })
    }
  }

  // Track security event
  trackSecurityEvent(type, severity, details) {
    this.securityEvents.inc({ type, severity })
    statsd.increment(`security.event.${type}.${severity}`)
    
    logger.warn('Security event detected', {
      type,
      severity,
      details,
      timestamp: new Date().toISOString(),
    })
  }

  // Health check endpoint
  async performHealthCheck() {
    const checks = {
      app: true,
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      storage: await this.checkStorage(),
    }

    // Update metrics
    Object.entries(checks).forEach(([component, healthy]) => {
      this.healthStatus.set({ component }, healthy ? 1 : 0)
    })

    const allHealthy = Object.values(checks).every(check => check)
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString(),
    }
  }

  async checkDatabase() {
    try {
      // Implement database health check
      // const result = await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      logger.error('Database health check failed', error)
      return false
    }
  }

  async checkRedis() {
    try {
      // Implement Redis health check
      // const result = await redis.ping()
      return true
    } catch (error) {
      logger.error('Redis health check failed', error)
      return false
    }
  }

  async checkStorage() {
    try {
      // Implement storage health check
      const fs = require('fs').promises
      await fs.access('logs', fs.constants.W_OK)
      return true
    } catch (error) {
      logger.error('Storage health check failed', error)
      return false
    }
  }

  // Export metrics for Prometheus
  getMetrics() {
    return register.metrics()
  }

  // Collect system metrics
  collectSystemMetrics() {
    const memUsage = process.memoryUsage()
    this.memoryUsage.set({ type: 'rss' }, memUsage.rss)
    this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal)
    this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed)
    this.memoryUsage.set({ type: 'external' }, memUsage.external)
  }

  // Start periodic metric collection
  startCollection(interval = 10000) {
    setInterval(() => {
      this.collectSystemMetrics()
    }, interval)

    logger.info('Monitoring system started', {
      metricsInterval: interval,
      prometheusEnabled: true,
      statsdEnabled: true,
    })
  }
}

// Alert Manager
class AlertManager {
  constructor(metrics) {
    this.metrics = metrics
    this.alerts = new Map()
  }

  defineAlerts() {
    // High error rate alert
    this.addAlert({
      name: 'high_error_rate',
      condition: () => this.getErrorRate() > 0.05, // 5% error rate
      message: 'Error rate exceeds 5%',
      severity: 'critical',
    })

    // Crisis response time alert
    this.addAlert({
      name: 'slow_crisis_response',
      condition: () => this.getCrisisResponseTime() > 30,
      message: 'Crisis response time exceeds 30 seconds',
      severity: 'critical',
    })

    // Memory usage alert
    this.addAlert({
      name: 'high_memory_usage',
      condition: () => this.getMemoryUsage() > 0.9, // 90% memory
      message: 'Memory usage exceeds 90%',
      severity: 'warning',
    })

    // Database connection pool alert
    this.addAlert({
      name: 'db_pool_exhausted',
      condition: () => this.getDBPoolUsage() > 0.8, // 80% pool usage
      message: 'Database connection pool usage exceeds 80%',
      severity: 'warning',
    })
  }

  addAlert(alert) {
    this.alerts.set(alert.name, alert)
  }

  checkAlerts() {
    this.alerts.forEach(alert => {
      if (alert.condition()) {
        this.fireAlert(alert)
      }
    })
  }

  fireAlert(alert) {
    logger.error('ALERT FIRED', {
      name: alert.name,
      message: alert.message,
      severity: alert.severity,
      timestamp: new Date().toISOString(),
    })

    // Send to external alerting system (e.g., PagerDuty, Slack)
    this.sendToAlertingSystem(alert)
  }

  sendToAlertingSystem(alert) {
    // Implement integration with alerting services
    if (process.env.SLACK_WEBHOOK_URL) {
      // Send to Slack
    }
    if (process.env.PAGERDUTY_KEY) {
      // Send to PagerDuty for critical alerts
    }
  }

  getErrorRate() {
    // Calculate error rate from metrics
    return 0.02 // Placeholder
  }

  getCrisisResponseTime() {
    // Get average crisis response time
    return 15 // Placeholder (seconds)
  }

  getMemoryUsage() {
    // Get memory usage percentage
    const memUsage = process.memoryUsage()
    return memUsage.heapUsed / memUsage.heapTotal
  }

  getDBPoolUsage() {
    // Get database pool usage
    return 0.5 // Placeholder
  }

  startMonitoring(interval = 60000) {
    setInterval(() => {
      this.checkAlerts()
    }, interval)
  }
}

// Distributed Tracing
class TracingSystem {
  constructor() {
    this.traces = new Map()
  }

  startTrace(traceId, operation) {
    const trace = {
      id: traceId,
      operation,
      startTime: Date.now(),
      spans: [],
    }
    this.traces.set(traceId, trace)
    return trace
  }

  addSpan(traceId, span) {
    const trace = this.traces.get(traceId)
    if (trace) {
      trace.spans.push({
        ...span,
        timestamp: Date.now(),
      })
    }
  }

  endTrace(traceId) {
    const trace = this.traces.get(traceId)
    if (trace) {
      trace.endTime = Date.now()
      trace.duration = trace.endTime - trace.startTime
      
      // Log trace for analysis
      logger.info('Trace completed', {
        traceId,
        operation: trace.operation,
        duration: trace.duration,
        spanCount: trace.spans.length,
      })
      
      // Clean up old traces
      this.traces.delete(traceId)
    }
  }
}

// Export monitoring system
const monitoringSystem = {
  metrics: new AstralCoreMetrics(),
  logger,
  statsd,
  alertManager: null,
  tracing: new TracingSystem(),
  
  initialize() {
    this.metrics.startCollection()
    this.alertManager = new AlertManager(this.metrics)
    this.alertManager.defineAlerts()
    this.alertManager.startMonitoring()
    
    logger.info('Astral Core Monitoring System Initialized', {
      components: ['metrics', 'logging', 'alerting', 'tracing'],
      environment: process.env.NODE_ENV,
    })
  },
  
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now()
      const traceId = req.headers['x-trace-id'] || generateTraceId()
      
      req.traceId = traceId
      this.tracing.startTrace(traceId, `${req.method} ${req.path}`)
      
      res.on('finish', () => {
        const duration = (Date.now() - startTime) / 1000
        this.metrics.trackHttpRequest(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          duration
        )
        
        logger.info('Request completed', {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          traceId,
        })
        
        this.tracing.endTrace(traceId)
      })
      
      next()
    }
  },
}

function generateTraceId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Initialize monitoring if running directly
if (require.main === module) {
  monitoringSystem.initialize()
  
  // Start metrics server for Prometheus
  const express = require('express')
  const app = express()
  
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType)
    const metrics = await monitoringSystem.metrics.getMetrics()
    res.end(metrics)
  })
  
  app.get('/health', async (req, res) => {
    const health = await monitoringSystem.metrics.performHealthCheck()
    res.status(health.status === 'healthy' ? 200 : 503).json(health)
  })
  
  const port = process.env.METRICS_PORT || 9090
  app.listen(port, () => {
    logger.info(`Metrics server listening on port ${port}`)
  })
}

module.exports = monitoringSystem