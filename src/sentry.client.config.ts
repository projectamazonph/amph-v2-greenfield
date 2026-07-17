/**
 * Sentry client config — Story 004.
 *
 * Initializes Sentry for client-side error tracking.
 * Only loads in the browser; server errors are handled separately.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Only enable in browser
  enabled: typeof window !== "undefined",

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
});
