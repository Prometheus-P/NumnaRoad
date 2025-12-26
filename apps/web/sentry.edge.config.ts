/**
 * Sentry Edge Configuration
 *
 * This file configures Sentry for edge runtime (middleware).
 * Issue: #22
 */

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',

    // Performance Monitoring (lower sample rate for edge)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0.5,

    // Debug mode in development
    debug: process.env.NODE_ENV === 'development',
  });
}
