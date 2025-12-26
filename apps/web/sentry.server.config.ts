/**
 * Sentry Server Configuration
 *
 * This file configures Sentry for the server environment.
 * Issue: #22
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Filter out non-critical errors
    ignoreErrors: [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
    ],

    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',

    // Sanitize sensitive data
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-api-key'];
      }
      return event;
    },
  });
}
