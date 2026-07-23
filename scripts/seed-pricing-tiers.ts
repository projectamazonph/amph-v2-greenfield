/**
 * scripts/seed-pricing-tiers.ts
 *
 * Seeds the four AMPH pricing tiers (foundations, mastery, ultimate,
 * all-access) into the Postgres database. Idempotent: re-running
 * safely upserts existing tiers without creating duplicates.
 *
 * Optionally links existing courses to their corresponding pricing tiers.
 *
 * Usage:
 *   pnpm db:seed:tiers              # seed tiers only
 *   pnpm db:seed:tiers --with-courses  # also link courses to tiers
 *   pnpm db:seed:tiers --dry-run    # print what would be done without writing
 *
 * Requires DATABASE_URL in .env.local. Run after `pnpm prisma migrate deploy`.
 *
 * STORY-015.
 */

import { existsSync, readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { prisma } from "@/infra/database/prisma";
import { PrismaPricingTierRepository } from "@/infra/repositories/PrismaPricingTierRepository";
import { Money } from "@/domain/values/Money";

// ── .env loader ──────────────────────────────────────────────────────────────

function loadEnvFile(path: string): void {
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

// ── Tier definitions ────────────────────────────────────────────────────────
//
// All prices are in minor PHP units (centavos).
//   299900 = ₱2,999.00
//   499900 = ₱4,999.00
//   599900 = ₱5,999.00
//   799900 = ₱7,999.00
//   999900 = ₱9,999.00
//   1499900 = ₱14,999.00

interface TierDef {
  id: string;
  slug: string;
  name: string;
  priceMinor: number;
  displayOrder: number;
  earlyBirdPriceMinor?: number;
  /** ISO date string — when early-bird pricing expires. */
  earlyBirdEndsAt?: string;
  /** Slug of the course that belongs to this tier (optional). */
  courseSlug?: string;
}

const TIERS: TierDef[] = [
  {
    id: "tier-foundations",
    slug: "foundations",
    name: "PPC Foundations",
    priceMinor: 299900,
    displayOrder: 1,
    courseSlug: "ppc-foundations",
  },
  {
    id: "tier-mastery",
    slug: "mastery",
    name: "Accelerated Mastery",
    priceMinor: 599900,
    displayOrder: 2,
    earlyBirdPriceMinor: 499900,
    earlyBirdEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    courseSlug: "ppc-mastery",
  },
  {
    id: "tier-ultimate",
    slug: "ultimate",
    name: "Ultimate Transformation",
    priceMinor: 999900,
    displayOrder: 3,
    earlyBirdPriceMinor: 799900,
    earlyBirdEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    courseSlug: "ppc-ultimate",
  },
  {
    id: "tier-all-access",
    slug: "all-access",
    name: "All-Access Pass",
    priceMinor: 1499900,
    displayOrder: 4,
    // No course slug — this tier covers all courses
  },
];

// ── Upsert logic ─────────────────────────────────────────────────────────────

async function upsertTier(def: TierDef): Promise<void> {
  const repo = new PrismaPricingTierRepository(prisma);

  // Check if tier exists
  const existing = await repo.findById(def.id);

  if (existing.ok && existing.value !== null) {
    // Update existing tier — rebuild price from Money factory
    const updated = {
      ...existing.value,
      name: def.name,
      price: Money.of(def.priceMinor, "PHP"),
      earlyBirdPriceMinor: def.earlyBirdPriceMinor,
      earlyBirdEndsAt: def.earlyBirdEndsAt ? new Date(def.earlyBirdEndsAt) : undefined,
    };
    const result = await repo.update(updated);
    if (!result.ok) {
      console.error(`  [ERROR] Failed to update tier "${def.slug}":`, result.error);
      return;
    }
    console.log(`  [UPDATE] "${def.slug}" → ₱${def.priceMinor / 100} (${def.name})`);
  } else {
    // Create new tier — construct proper PricingTier entity with Money
    const tier = {
      id: def.id,
      slug: def.slug,
      name: def.name,
      price: Money.of(def.priceMinor, "PHP"),
      status: "ACTIVE" as const,
      displayOrder: def.displayOrder,
      earlyBirdPriceMinor: def.earlyBirdPriceMinor,
      earlyBirdEndsAt: def.earlyBirdEndsAt ? new Date(def.earlyBirdEndsAt) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await repo.create(tier);
    if (!result.ok) {
      console.error(`  [ERROR] Failed to create tier "${def.slug}":`, result.error);
      return;
    }
    console.log(`  [CREATE] "${def.slug}" → ₱${def.priceMinor / 100} (${def.name})`);
  }
}

async function linkCourseToTier(courseSlug: string, tierId: string): Promise<void> {
  const course = await prisma.course.findUnique({ where: { slug: courseSlug } });
  if (!course) {
    console.log(`  [SKIP]  Course "${courseSlug}" not found — skipping link`);
    return;
  }

  await prisma.course.update({
    where: { id: course.id },
    data: { pricingTierId: tierId },
  });
  console.log(`  [LINK]  Course "${courseSlug}" → tier "${tierId}"`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const { values } = parseArgs({
    options: {
      "with-courses": { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const withCourses = values["with-courses"] === true;
  const dryRun = values["dry-run"] === true;

  console.log("\n📦 AMPH Pricing Tier Seed");
  console.log("─".repeat(40));
  console.log(`  Mode:   ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`  Action: seed tiers${withCourses ? " + link courses" : ""}`);
  console.log("─".repeat(40) + "\n");

  if (dryRun) {
    for (const tier of TIERS) {
      const eb = tier.earlyBirdPriceMinor
        ? ` (early-bird ₱${tier.earlyBirdPriceMinor / 100} until ${tier.earlyBirdEndsAt?.slice(0, 10) ?? "?"})`
        : "";
      console.log(`  [DRY]   "${tier.slug}" → ₱${tier.priceMinor / 100}${eb}`);
    }
    console.log("\n✅ Dry run complete.\n");
    return;
  }

  console.log("Upserting pricing tiers...\n");
  for (const tier of TIERS) {
    await upsertTier(tier);
  }

  if (withCourses) {
    console.log("\nLinking courses to tiers...\n");
    const courseLinkDefs = TIERS.filter((t) => t.courseSlug !== undefined) as Array<
      TierDef & { courseSlug: string }
    >;
    for (const def of courseLinkDefs) {
      await linkCourseToTier(def.courseSlug, def.id);
    }
  }

  console.log("\n✅ Done. Pricing tiers are ready.\n");
}

main()
  .catch((err) => {
    console.error("\n❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
