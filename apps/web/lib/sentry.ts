import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 1.0,

    // ... Set this to enable extraction of trace propagation headers for outgoing requests
    tracePropagationTargets: ['localhost', /^\//],
    
    // Capture user feedback for errors
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],

    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then to a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when an error occurs.
  });
}
