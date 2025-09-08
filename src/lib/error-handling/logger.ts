/**
 * Comprehensive logging service for the platform
 * Supports multiple log levels, structured logging, and various outputs
 */

import { prisma } from '@/lib/prisma';

// Log levels
export enum LogLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

// Log level priorities for filtering
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.TRACE]: 0,
  [LogLevel.DEBUG]: 1,
  [LogLevel.INFO]: 2,
  [LogLevel.WARN]: 3,
  [LogLevel.ERROR]: 4,
  [LogLevel.FATAL]: 5,
};

// Log entry interface
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  category?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  source?: string;
  stackTrace?: string;
}

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  outputs: LogOutput[];
  enableConsole: boolean;
  enableDatabase: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  bufferSize: number;
  flushInterval: number;
  includePII: boolean;
  sanitizers: LogSanitizer[];
}

// Log output interface
export interface LogOutput {
  type: 'console' | 'database' | 'file' | 'remote';
  level?: LogLevel;
  format?: 'json' | 'text';
  destination?: string;
}

// Log sanitizer interface
export interface LogSanitizer {
  pattern: RegExp;
  replacement: string;
}

// Default sanitizers for PII
const DEFAULT_SANITIZERS: LogSanitizer[] = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN]' }, // SSN
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' }, // Email
  { pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g, replacement: '[CARD]' }, // Credit card
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' }, // Phone number
  { pattern: /"password"\s*:\s*"[^"]+"/gi, replacement: '"password":"[REDACTED]"' }, // Password
  { pattern: /"token"\s*:\s*"[^"]+"/gi, replacement: '"token":"[REDACTED]"' }, // Token
  { pattern: /"apiKey"\s*:\s*"[^"]+"/gi, replacement: '"apiKey":"[REDACTED]"' }, // API Key
];

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  level: process.env.LOG_LEVEL as LogLevel || LogLevel.INFO,
  outputs: [
    { type: 'console', format: 'text' },
    { type: 'database', level: LogLevel.WARN },
  ],
  enableConsole: process.env.NODE_ENV !== 'production',
  enableDatabase: true,
  enableFile: false,
  enableRemote: false,
  bufferSize: 100,
  flushInterval: 5000, // 5 seconds
  includePII: false,
  sanitizers: DEFAULT_SANITIZERS,
};

export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startFlushTimer();
  }

  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Log trace message
   */
  trace(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log fatal message
   */
  fatal(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context);
    // Flush immediately for fatal errors
    this.flush().catch(console.error);
  }

  /**
   * Main logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    // Check if level should be logged
    if (!this.shouldLog(level)) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date(),
      level,
      message: this.sanitizeMessage(message),
      context: context ? this.sanitizeContext(context) : undefined,
      metadata: this.getMetadata(),
      source: this.getSource(),
    };

    // Add to buffer
    this.buffer.push(entry);

    // Output to configured destinations
    this.outputLog(entry);

    // Check if buffer should be flushed
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush().catch(console.error);
    }
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level];
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize message
   */
  private sanitizeMessage(message: string): string {
    if (!this.config.includePII) {
      let sanitized = message;
      for (const sanitizer of this.config.sanitizers) {
        sanitized = sanitized.replace(sanitizer.pattern, sanitizer.replacement);
      }
      return sanitized;
    }
    return message;
  }

  /**
   * Sanitize context
   */
  private sanitizeContext(context: Record<string, any>): Record<string, any> {
    if (!this.config.includePII) {
      const sanitized = JSON.stringify(context);
      let result = sanitized;
      for (const sanitizer of this.config.sanitizers) {
        result = result.replace(sanitizer.pattern, sanitizer.replacement);
      }
      return JSON.parse(result);
    }
    return context;
  }

  /**
   * Get metadata for log entry
   */
  private getMetadata(): Record<string, any> {
    return {
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      memory: process.memoryUsage(),
    };
  }

  /**
   * Get source of log
   */
  private getSource(): string {
    const stack = new Error().stack;
    if (stack) {
      const lines = stack.split('\n');
      if (lines.length > 3) {
        const match = lines[3].match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
        if (match) {
          return `${match[2]}:${match[3]}`;
        }
      }
    }
    return 'unknown';
  }

  /**
   * Output log to configured destinations
   */
  private outputLog(entry: LogEntry): void {
    for (const output of this.config.outputs) {
      if (output.level && !this.shouldLogToOutput(entry.level, output.level)) {
        continue;
      }

      switch (output.type) {
        case 'console':
          if (this.config.enableConsole) {
            this.logToConsole(entry, output.format || 'text');
          }
          break;
        case 'database':
          // Database logs are buffered
          break;
        case 'file':
          if (this.config.enableFile) {
            this.logToFile(entry, output.destination);
          }
          break;
        case 'remote':
          if (this.config.enableRemote) {
            this.logToRemote(entry, output.destination);
          }
          break;
      }
    }
  }

  /**
   * Check if should log to specific output
   */
  private shouldLogToOutput(entryLevel: LogLevel, outputLevel: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[entryLevel] >= LOG_LEVEL_PRIORITY[outputLevel];
  }

  /**
   * Log to console
   */
  private logToConsole(entry: LogEntry, format: 'json' | 'text'): void {
    const timestamp = entry.timestamp.toISOString();
    
    if (format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      const prefix = `[${timestamp}] [${entry.level}]`;
      const message = `${prefix} ${entry.message}`;
      
      switch (entry.level) {
        case LogLevel.TRACE:
        case LogLevel.DEBUG:
          console.debug(message, entry.context || '');
          break;
        case LogLevel.INFO:
          console.info(message, entry.context || '');
          break;
        case LogLevel.WARN:
          console.warn(message, entry.context || '');
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(message, entry.context || '');
          break;
      }
    }
  }

  /**
   * Log to file (placeholder)
   */
  private logToFile(entry: LogEntry, destination?: string): void {
    // TODO: Implement file logging
    // This would write to a file system or cloud storage
  }

  /**
   * Log to remote service (placeholder)
   */
  private logToRemote(entry: LogEntry, destination?: string): void {
    // TODO: Implement remote logging
    // This would send to services like CloudWatch, Datadog, etc.
  }

  /**
   * Flush buffer to database
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    // Filter entries for database
    const dbEntries = entries.filter(entry => 
      this.config.enableDatabase &&
      LOG_LEVEL_PRIORITY[entry.level] >= LOG_LEVEL_PRIORITY[LogLevel.WARN]
    );

    if (dbEntries.length === 0) return;

    try {
      await (prisma as any).systemLog.createMany({
        data: dbEntries.map(entry => ({
          logId: entry.id,
          level: entry.level,
          message: entry.message,
          category: entry.category,
          context: entry.context || {},
          metadata: entry.metadata || {},
          userId: entry.userId,
          sessionId: entry.sessionId,
          requestId: entry.requestId,
          source: entry.source,
          timestamp: entry.timestamp,
        })),
      });
    } catch (error) {
      console.error('Failed to flush logs to database:', error);
      // Re-add entries to buffer for retry
      this.buffer.unshift(...dbEntries);
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flushInterval);

    // Handle process termination
    process.on('beforeExit', () => {
      this.flush().catch(console.error);
    });
  }

  /**
   * Stop flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
  }

  /**
   * Create child logger with context
   */
  child(context: Record<string, any>): ContextLogger {
    return new ContextLogger(this, context);
  }
}

/**
 * Context logger for adding persistent context
 */
export class ContextLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, any>
  ) {}

  trace(message: string, context?: Record<string, any>): void {
    this.parent.trace(message, { ...this.context, ...context });
  }

  debug(message: string, context?: Record<string, any>): void {
    this.parent.debug(message, { ...this.context, ...context });
  }

  info(message: string, context?: Record<string, any>): void {
    this.parent.info(message, { ...this.context, ...context });
  }

  warn(message: string, context?: Record<string, any>): void {
    this.parent.warn(message, { ...this.context, ...context });
  }

  error(message: string, context?: Record<string, any>): void {
    this.parent.error(message, { ...this.context, ...context });
  }

  fatal(message: string, context?: Record<string, any>): void {
    this.parent.fatal(message, { ...this.context, ...context });
  }
}

// Export singleton instance
export const logger = Logger.getInstance();