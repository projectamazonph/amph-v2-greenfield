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
  const total = await prisma.resource.count();
  const published = await prisma.resource.count({ where: { isPublished: true } });
  const byCategory = await prisma.resource.groupBy({
    by: ["category", "isPublished"],
    _count: { _all: true },
  });
  console.log(`Total rows: ${total}`);
  console.log(`Published rows: ${published}`);
  console.log("By category × published:");
  for (const row of byCategory) {
    console.log(
      `  ${row.category.padEnd(18)} published=${row.isPublished}  count=${row._count._all}`,
    );
  }
  await prisma.$disconnect();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
