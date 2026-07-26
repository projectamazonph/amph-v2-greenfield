/**
 * scripts/seed-admin-user.mjs
 *
 * Creates (or promotes) a single ADMIN user directly via Prisma, bypassing
 * UserRepository.create() — that method hardcodes role: "STUDENT" (it's the
 * self-signup path), so seeding an admin has to go straight to the DB.
 * Idempotent: re-running against an existing email promotes it to ADMIN
 * instead of failing on the unique constraint.
 *
 * Password hashing mirrors src/infra/security/Argon2PasswordHasher.ts
 * exactly (Argon2id, 64MB, t=3, p=1) so the result is a login-compatible hash.
 *
 * Usage:
 *   pnpm db:seed:admin --email admin@example.com --password 'Str0ng!Passw0rd' --first-name Admin --last-name User
 *   pnpm db:seed:admin --email admin@example.com                # generates and prints a random password
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm db:seed:admin        # env vars work too
 *
 * Requires DATABASE_URL in .env.local. Run after `pnpm prisma migrate deploy`.
 *
 * See docs/runbooks/admin-access-recovery.md for the manual SQL fallback.
 */

import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// argon2 is CJS-only — createRequire matches the interop trick used by
// src/infra/security/Argon2PasswordHasher.ts, the module this script mirrors.
const require = createRequire(import.meta.url);
const argon2 = require("argon2");

// ── .env loader (same convention as the other scripts/ seeders) ────────────

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf-8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL is not set. Check .env.local or .env.");
  process.exit(1);
}

// ── Args ─────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    "first-name": { type: "string" },
    "last-name": { type: "string" },
  },
  allowPositionals: true,
});

const email = (values.email ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const firstName = values["first-name"] ?? process.env.ADMIN_FIRST_NAME ?? "Admin";
const lastName = values["last-name"] ?? process.env.ADMIN_LAST_NAME ?? "User";
const explicitPassword = values.password ?? process.env.ADMIN_PASSWORD ?? "";

if (!email) {
  console.error(
    "Error: an email is required. Pass --email admin@example.com or set ADMIN_EMAIL.",
  );
  process.exit(1);
}

// ── Hash (must match Argon2PasswordHasher exactly) ──────────────────────────

async function hashPassword(plain) {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 65_536, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

// ── Main ─────────────────────────────────────────────────────────────────

// Prisma 7 requires a driver adapter — mirrors src/infra/database/prisma.ts.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("\n👤 AMPH Admin User Seed");
  console.log("─".repeat(40));
  console.log(`  Email: ${email}`);
  console.log("─".repeat(40) + "\n");

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const data = { role: "ADMIN" };
    // Only rotate the password if one was explicitly supplied — don't
    // clobber an existing admin's password on a routine re-run, and don't
    // generate one either: a generated password only means something if
    // it's actually written to the row.
    if (explicitPassword) {
      data.password = await hashPassword(explicitPassword);
    }
    await prisma.user.update({ where: { id: existing.id }, data });
    console.log(
      `  [PROMOTE] "${email}" → role ADMIN${data.password ? " (password rotated)" : ""}`,
    );
  } else {
    const password = explicitPassword || randomBytes(18).toString("base64url");
    await prisma.user.create({
      data: {
        email,
        password: await hashPassword(password),
        firstName,
        lastName,
        role: "ADMIN",
        verificationStatus: "VERIFIED",
        subscriptionTier: "FREE",
        simulatorAccess: "NONE",
        enrolledCourseIds: [],
        twoFactorEnabled: false,
      },
    });
    console.log(`  [CREATE]  "${email}" → role ADMIN`);
    if (!explicitPassword) {
      console.log(`\n  Generated password: ${password}`);
      console.log("  This was printed to your shell history. Rotate it after first login.");
    }
  }

  console.log("\n✅ Done.\n");
}

main()
  .catch((err) => {
    console.error("\n❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
