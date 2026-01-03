/**
 * Structured Logger for Services Layer
 *
 * Provides consistent JSON-formatted logging across all services.
 * Mirrors the logger in apps/web/lib/logger.ts for consistency.
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

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

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

export const logger = createLogger();
