import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  // STORY-0026 follow-up: build a self-contained production artifact
  // so the lighthouse job (and any other consumer) can start the
  // server without the broken pnpm-store symlinks in .next/.
  output: 'standalone',
};

export default withSentryConfig(nextConfig, {
  // Source map upload is disabled when auth token is missing so that
  // local and CI builds succeed without real Sentry credentials.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG ?? "amph",
  project: process.env.SENTRY_PROJECT ?? "amph-v2",
  silent: !process.env.SENTRY_AUTH_TOKEN,
});
