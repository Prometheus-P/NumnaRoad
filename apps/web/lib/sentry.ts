import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,

    // Set this to enable extraction of trace propagation headers for outgoing requests
    tracePropagationTargets: ['localhost', /^\//],

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
