/**
 * Sentry edge config — STORY-051.
 *
 * Initializes Sentry for the Next.js edge runtime (middleware / proxy).
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? "",
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  ignoreErrors: [
    "NEXT_REDIRECT",
  ],
});
