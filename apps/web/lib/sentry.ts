/**
 * Sentry Error Tracking Configuration
 *
 * Issue: #22
 */

import * as Sentry from '@sentry/nextjs';

let isInitialized = false;

/**
 * Initialize Sentry for error tracking
 * Only initializes once and only in production
 */
export function initSentry(): void {
  if (isInitialized) return;

  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.log('[Sentry] No DSN configured, skipping initialization');
    return;
  }

  const environment = process.env.NODE_ENV || 'development';

  Sentry.init({
    dsn,
    environment,

    // Performance Monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Session Replay (only in production)
    replaysSessionSampleRate: environment === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    // Filter out non-critical errors
    ignoreErrors: [
      // Browser errors
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      // Network errors
      'Network request failed',
      'Failed to fetch',
      // User aborted
      'AbortError',
    ],

    // Sanitize sensitive data
    beforeSend(event) {
      // Remove email addresses from error messages
      if (event.message) {
        event.message = event.message.replace(
          /[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}/g,
          '[EMAIL_REDACTED]'
        );
      }

      // Remove sensitive headers
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }

      return event;
    },

    // Add additional context
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
        return null;
      }
      return breadcrumb;
    },
  });

  isInitialized = true;
  console.log('[Sentry] Initialized for environment:', environment);
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error | unknown,
  context?: {
    correlationId?: string;
    orderId?: string;
    userId?: string;
    extra?: Record<string, unknown>;
  }
): void {
  if (!isInitialized) {
    console.error('[Sentry] Not initialized, logging error:', error);
    return;
  }

  Sentry.withScope((scope) => {
    if (context?.correlationId) {
      scope.setTag('correlation_id', context.correlationId);
    }
    if (context?.orderId) {
      scope.setTag('order_id', context.orderId);
    }
    if (context?.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context?.extra) {
      scope.setExtras(context.extra);
    }

    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureMessage(String(error), 'error');
    }
  });
}

/**
 * Capture a message with severity level
 */
export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): void {
  if (!isInitialized) {
    console.log(`[Sentry] Not initialized, logging ${level}:`, message);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureMessage(message, level);
  });
}

/**
 * Set user context for subsequent errors
 */
export function setUser(user: { id: string; email?: string } | null): void {
  if (!isInitialized) return;

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email ? '[REDACTED]' : undefined,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for tracing
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: 'debug' | 'info' | 'warning' | 'error';
  data?: Record<string, unknown>;
}): void {
  if (!isInitialized) return;

  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
  });
}
