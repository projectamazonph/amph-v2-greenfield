import { prisma } from "@/infra/database/prisma";
import { existsSync, readFileSync } from "node:fs";

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
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

async function main() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  const tiers = await prisma.pricingTier.count();
  const policies = await prisma.scorePolicy.count();
  const scenarios = await prisma.simulatorScenario.count();
  const resources = await prisma.resource.count();
  const resourcesPublished = await prisma.resource.count({ where: { isPublished: true } });

  console.log("Seed verification:");
  console.log(`  ADMIN users:           ${admins.length}`);
  for (const a of admins) console.log(`    - ${a.email} (${a.firstName} ${a.lastName})`);
  console.log(`  Pricing tiers:         ${tiers}`);
  console.log(`  Score policies:        ${policies}`);
  console.log(`  Simulator scenarios:   ${scenarios}`);
  console.log(`  Resources (total):     ${resources}`);
  console.log(`  Resources (published): ${resourcesPublished}`);
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
