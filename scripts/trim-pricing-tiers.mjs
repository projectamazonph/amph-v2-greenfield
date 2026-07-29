/**
 * scripts/trim-pricing-tiers.mjs
 *
 * Removes pricing tiers that don't match the canonical 3-tier set:
 *   - foundations  (PPC Foundations)
 *   - accelerated  (Accelerated Mastery)
 *   - ultimate     (Ultimate Transformation)
 *
 * Anything else (e.g. "mastery", "all-access", or test tiers) gets deleted.
 * Re-runnable. Safe: the canonical 3 are upserted by seed-all-content.mjs.
 */

import { readFileSync, existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf-8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
}

const CANONICAL = new Set(["foundations", "accelerated", "ultimate"]);

const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { Pool } = await import("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const all = await prisma.pricingTier.findMany({ orderBy: { displayOrder: "asc" } });
const stale = all.filter((t) => !CANONICAL.has(t.slug));

if (stale.length === 0) {
  console.log("[trim] No stale tiers. Nothing to do.");
} else {
  console.log(`[trim] Deleting ${stale.length} stale tier(s):`);
  for (const t of stale) console.log(`  - ${t.slug} (${t.name}, PHP ${(t.priceMinor / 100).toFixed(2)})`);

  // Detach any course that references a stale tier first
  for (const t of stale) {
    const linked = await prisma.course.updateMany({
      where: { pricingTierId: t.id },
      data: { pricingTierId: null },
    });
    if (linked.count > 0) console.log(`  - detached ${linked.count} course(s) from ${t.slug}`);
  }

  const deleted = await prisma.pricingTier.deleteMany({
    where: { slug: { in: stale.map((t) => t.slug) } },
  });
  console.log(`[trim] Deleted ${deleted.count} stale tier row(s).`);
}

const remaining = await prisma.pricingTier.findMany({ orderBy: { displayOrder: "asc" } });
console.log(`\n[trim] Remaining tiers (${remaining.length}):`);
for (const t of remaining) {
  console.log(`  ${t.slug.padEnd(20)} | ${t.name.padEnd(30)} | PHP ${(t.priceMinor / 100).toFixed(2)}`);
}

await prisma.$disconnect();
process.exit(0);
