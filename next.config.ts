import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  // Local CI needs a self-contained server artifact, while Vercel uses
  // its native trace layout. Enabling standalone on Vercel omits the trace
  // manifest expected by the deployment builder after newer Next upgrades.
  output: process.env.VERCEL ? undefined : "standalone",
  // The generated Prisma client (query compiler WASM + generated JS)
  // lives in node_modules/.prisma/client, a dot-prefixed directory that
  // @prisma/client requires via a computed path rather than a literal
  // string. @vercel/nft's static trace never sees it, so it's silently
  // dropped from .next/standalone unless explicitly included here.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/**/*"],
  },
};

export default withSentryConfig(nextConfig, {
  // Source map upload is disabled when auth token is missing so that
  // local and CI builds succeed without real Sentry credentials.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG ?? "amph",
  project: process.env.SENTRY_PROJECT ?? "amph-v2",
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Keep builds deterministic in restricted CI environments. Runtime error
  // reporting and authenticated source-map uploads are unaffected.
  telemetry: false,
});
