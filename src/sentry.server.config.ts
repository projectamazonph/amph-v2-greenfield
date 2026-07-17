/**
 * Sentry server config — Story 004.
 *
 * Initializes Sentry for server-side error tracking.
 * Catches unhandled exceptions in server components, server actions, and API routes.
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "",
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  // Ignore known noisy errors
  ignoreErrors: [
    "NEXT_REDIRECT", // Next.js redirects are not errors
    "PrismaClientKnownRequestError", // logged at repository layer
  ],
});
