/**
 * scripts/validate-env.ts
 *
 * Pre-build environment variable validation.
 * Run as:  pnpm validate-env   (or as pre-build step)
 *
 * Checks:
 *   1. All required env vars are present and non-empty
 *   2. DATABASE_URL is a valid PostgreSQL connection string
 *   3. JWT_SECRET is at least 32 bytes
 *   4. PAYMONGO_SECRET is present (or is a test key)
 *   5. RESEND_API_KEY is present (or is a test key)
 *   6. NEXT_PUBLIC_BASE_URL is a valid URL
 *
 * Exits with code 1 if any check fails.
 * Use ts-node to run:  npx ts-node scripts/validate-env.ts
 */

interface EnvVar {
  key: string;
  required: boolean;
  minLength?: number;
  pattern?: RegExp;
  patternDescription?: string;
}

const vars: EnvVar[] = [
  // Database
  {
    key: "DATABASE_URL",
    required: true,
    pattern: /^postgresql:\/\/.+:\S+@\S+:\d+\/\w+/,
    patternDescription: "postgresql://user:password@host:port/database",
  },

  // Auth
  {
    key: "JWT_SECRET",
    required: true,
    minLength: 32,
  },

  // PayMongo
  {
    key: "PAYMONGO_SECRET",
    required: true,
  },
  {
    key: "PAYMONGO_WEBHOOK_SECRET",
    required: false,
  },

  // Email
  {
    key: "RESEND_API_KEY",
    required: true,
  },
  {
    key: "EMAIL_FROM",
    required: false,
  },

  // App
  {
    key: "NEXT_PUBLIC_BASE_URL",
    required: false,
    pattern: /^https?:\/\/.+/,
    patternDescription: "http://localhost:3000 or https://yourdomain.com",
  },

  // Upstash (rate limiting)
  {
    key: "UPSTASH_REDIS_REST_URL",
    required: false,
  },
  {
    key: "UPSTASH_REDIS_REST_TOKEN",
    required: false,
  },

  // Sentry (observability)
  {
    key: "SENTRY_DSN",
    required: false,
  },
];

const errors: string[] = [];

for (const v of vars) {
  const value = process.env[v.key];

  if (v.required && (!value || value.trim() === "")) {
    errors.push(`  [MISSING] ${v.key} — required but not set`);
    continue;
  }

  if (!value) continue; // optional and not set — OK

  if (v.minLength !== undefined && value.length < v.minLength) {
    errors.push(
      `  [INVALID] ${v.key} — must be at least ${v.minLength} characters (got ${value.length})`,
    );
  }

  if (v.pattern && !v.pattern.test(value)) {
    errors.push(`  [INVALID] ${v.key} — must match pattern: ${v.patternDescription ?? v.pattern}`);
  }
}

// Special checks
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  if (url.includes("localhost") && !url.includes("sslmode=")) {
    // localhost is fine without SSL — no error
  }
}

if (errors.length > 0) {
  console.error("Environment validation FAILED:\n");
  errors.forEach((e) => console.error(e));
  console.error("\nSet the missing/invalid variables in .env.local");
  console.error("See .env.example for reference.");
  process.exit(1);
}

// Also check prisma generate was run (look for generated client)
const { existsSync } = await import("node:fs");
const generatedClient = join("src/generated/prisma");
if (!existsSync(generatedClient)) {
  console.warn("  [WARN] Prisma client not generated — run: pnpm prisma generate");
}

console.log("Environment validation PASSED");
console.log("  All required env vars are set and valid.");

// Helper
function join(...parts: string[]): string {
  // Use import.meta.url equivalent in CommonJS
  return parts.join("/");
}
