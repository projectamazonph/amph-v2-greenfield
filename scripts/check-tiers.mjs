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

const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { Pool } = await import("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const tiers = await prisma.pricingTier.findMany({ orderBy: { displayOrder: "asc" } });
console.log("All tiers in DB:");
for (const t of tiers) {
  console.log(`  ${t.slug.padEnd(20)} | ${t.name.padEnd(30)} | ${t.priceMinor} | id=${t.id}`);
}

const courses = await prisma.course.findMany({
  orderBy: { displayOrder: "asc" },
  include: { pricingTier: true },
});
console.log("\nCourses with tier link:");
for (const c of courses) {
  console.log(`  ${c.slug.padEnd(25)} -> ${c.pricingTier ? c.pricingTier.slug : "(no tier)"}`);
}

await prisma.$disconnect();
process.exit(0);
