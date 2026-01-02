/**
 * Structured Logger Utility
 *
 * Provides consistent JSON-formatted logging for Vercel deployment.
 * All logs include timestamp, level, and optional correlation ID.
 *
 * @example
 * import { logger, createLogger } from '@/lib/logger';
 *
 * // Global logger
 * logger.info('order_created', { orderId: 'ORD-123' });
 *
 * // With correlation ID
 * const log = createLogger(correlationId);
 * log.info('payment_received', { amount: 1000 });
 */

// =============================================================================
// Types
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  event: string;
  timestamp: string;
  correlationId?: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

export interface Logger {
  debug: (event: string, context?: LogContext) => void;
  info: (event: string, context?: LogContext) => void;
  warn: (event: string, context?: LogContext) => void;
  error: (event: string, error?: Error | unknown, context?: LogContext) => void;
}

// =============================================================================
// Configuration
// =============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Get minimum log level from environment.
 * Defaults to 'debug' in development, 'info' in production.
 */
function getMinLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

const MIN_LOG_LEVEL = getMinLogLevel();

// =============================================================================
// Core Implementation
// =============================================================================

/**
 * Check if a log level should be output based on minimum level.
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

/**
 * Format error for JSON serialization.
 */
function formatError(error: Error | unknown): LogEntry['error'] {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
  return {
    message: String(error),
  };
}

/**
 * Create a log entry object.
 */
function createLogEntry(
  level: LogLevel,
  event: string,
  correlationId?: string,
  context?: LogContext,
  error?: Error | unknown
): LogEntry {
  const entry: LogEntry = {
    level,
    event,
    timestamp: new Date().toISOString(),
  };

  if (correlationId) {
    entry.correlationId = correlationId;
  }

  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }

  if (error) {
    entry.error = formatError(error);
  }

  return entry;
}

/**
 * Output log entry to console.
 * Uses appropriate console method for log level.
 */
function outputLog(entry: LogEntry): void {
  const output = JSON.stringify(entry);

  switch (entry.level) {
    case 'debug':
      console.debug(output);
      break;
    case 'info':
      console.log(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'error':
      console.error(output);
      break;
  }
}

/**
 * Create a logger instance with optional correlation ID.
 *
 * @param correlationId - Optional correlation ID for request tracing
 * @returns Logger instance with debug, info, warn, error methods
 *
 * @example
 * const log = createLogger('req-123');
 * log.info('user_login', { userId: 'user-456' });
 */
export function createLogger(correlationId?: string): Logger {
  return {
    debug(event: string, context?: LogContext): void {
      if (shouldLog('debug')) {
        outputLog(createLogEntry('debug', event, correlationId, context));
      }
    },

    info(event: string, context?: LogContext): void {
      if (shouldLog('info')) {
        outputLog(createLogEntry('info', event, correlationId, context));
      }
    },

    warn(event: string, context?: LogContext): void {
      if (shouldLog('warn')) {
        outputLog(createLogEntry('warn', event, correlationId, context));
      }
    },

    error(event: string, error?: Error | unknown, context?: LogContext): void {
      if (shouldLog('error')) {
        outputLog(createLogEntry('error', event, correlationId, context, error));
      }
    },
  };
}

// =============================================================================
// Default Logger
// =============================================================================

/**
 * Global logger instance without correlation ID.
 * Use createLogger() for request-scoped logging with correlation ID.
 */
export const logger = createLogger();

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a child logger that inherits correlation ID and adds prefix to events.
 *
 * @param parent - Parent logger or correlation ID
 * @param prefix - Prefix to add to all event names
 *
 * @example
 * const orderLog = createChildLogger(correlationId, 'order');
 * orderLog.info('created', { orderId: '123' }); // event: "order.created"
 */
export function createChildLogger(
  parent: string | undefined,
  prefix: string
): Logger {
  const correlationId = typeof parent === 'string' ? parent : undefined;

  return {
    debug(event: string, context?: LogContext): void {
      if (shouldLog('debug')) {
        outputLog(createLogEntry('debug', `${prefix}.${event}`, correlationId, context));
      }
    },

    info(event: string, context?: LogContext): void {
      if (shouldLog('info')) {
        outputLog(createLogEntry('info', `${prefix}.${event}`, correlationId, context));
      }
    },

    warn(event: string, context?: LogContext): void {
      if (shouldLog('warn')) {
        outputLog(createLogEntry('warn', `${prefix}.${event}`, correlationId, context));
      }
    },

    error(event: string, error?: Error | unknown, context?: LogContext): void {
      if (shouldLog('error')) {
        outputLog(createLogEntry('error', `${prefix}.${event}`, correlationId, context, error));
      }
    },
  };
}

/**
 * Measure and log execution time of an async function.
 *
 * @param log - Logger instance to use
 * @param event - Event name for the timing log
 * @param fn - Async function to measure
 *
 * @example
 * const result = await withTiming(log, 'api_call', async () => {
 *   return fetch('/api/data');
 * });
 */
export async function withTiming<T>(
  log: Logger,
  event: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await fn();
    log.info(`${event}_completed`, { durationMs: Date.now() - startTime });
    return result;
  } catch (error) {
    log.error(`${event}_failed`, error, { durationMs: Date.now() - startTime });
    throw error;
  }
}
