/**
 * Next.js instrumentation entry point — STORY-051.
 *
 * Loads Sentry for the appropriate runtime. Next.js calls
 * `register()` once per runtime (node or edge).
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./src/sentry.edge.config");
  } else {
    await import("./src/sentry.server.config");
  }
}

export const onRequestError = async (
  error: Error,
  request: { path: string; method: string },
) => {
  // Dynamically import Sentry only when needed to keep the
  // instrumentation module light and build-safe.
  const { captureException } = await import("@sentry/nextjs");
  captureException(error, {
    extra: { path: request.path, method: request.method },
  });
};
