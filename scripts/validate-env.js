#!/usr/bin/env node
/**
 * scripts/validate-env.js
 *
 * Pre-build environment variable validation.
 * Run as pre-build step:  node scripts/validate-env.js
 *
 * Checks all required env vars are present and correctly formatted.
 * Loads .env.local automatically before checking.
 * Exits with code 1 if any check fails.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env.local manually (Node doesn't auto-load it)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envLocal = resolve(__dirname, "../.env.local");
try {
  const content = readFileSync(envLocal, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
} catch {
  // .env.local not found — continue anyway (vars may come from shell env)
}

const required = [
  {
    key: "DATABASE_URL",
    pattern: /^postgresql:\/\/.+:\S+@\S+:\d+\/\w+/,
    desc: "postgresql://user:***@host:port/database",
  },
  {
    key: "JWT_SECRET",
    minLength: 32,
  },
  {
    key: "PAYMONGO_SECRET",
  },
];

const optional = [
  { key: "RESEND_API_KEY", pattern: /^re_[a-zA-Z0-9]+/ },
  { key: "EMAIL_FROM" },
  { key: "NEXT_PUBLIC_BASE_URL", pattern: /^https?:\/\/.+/ },
  { key: "UPSTASH_REDIS_REST_URL" },
  { key: "UPSTASH_REDIS_REST_TOKEN" },
  { key: "SENTRY_DSN" },
];

const errors = [];

for (const v of required) {
  const value = process.env[v.key];
  if (!value || value.trim() === "") {
    errors.push(`[MISSING] ${v.key} — required but not set`);
    continue;
  }
  if (v.minLength !== undefined && value.length < v.minLength) {
    errors.push(`[INVALID] ${v.key} — must be at least ${v.minLength} chars (got ${value.length})`);
  }
  if (v.pattern && !v.pattern.test(value)) {
    errors.push(`[INVALID] ${v.key} — must match: ${v.desc ?? v.pattern}`);
  }
}

for (const v of optional) {
  const value = process.env[v.key];
  if (!value) continue;
  if (v.pattern && !v.pattern.test(value)) {
    errors.push(`[INVALID] ${v.key} — must match: ${v.pattern}`);
  }
}

if (errors.length > 0) {
  console.error("Environment validation FAILED:\n");
  errors.forEach((e) => console.error("  " + e));
  console.error("\nSet missing/invalid variables in .env.local");
  console.error("See .env.example for reference.");
  process.exit(1);
}

console.log("Environment validation PASSED — all required env vars present and valid.");
