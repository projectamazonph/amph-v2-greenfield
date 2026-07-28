import { readFileSync, existsSync } from "node:fs";

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
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
loadEnv(".env.local");
loadEnv(".env");

const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { Pool } = await import("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const courses = await prisma.course.findMany({ orderBy: { displayOrder: "asc" } });
console.log("Courses:", courses.length);
courses.forEach((c) => console.log("  ", c.slug, "-", c.title, "| published:", c.isPublished));

const modules = await prisma.module.findMany({ orderBy: { displayOrder: "asc" } });
console.log("\nModules:", modules.length);
modules.forEach((m) => console.log("  ", m.displayOrder, m.title));

const lessons = await prisma.lesson.count();
console.log("\nLessons:", lessons);

const quizzes = await prisma.quiz.findMany({ include: { questions: true } });
console.log("\nQuizzes:", quizzes.length);
quizzes.forEach((q) => console.log("  ", q.title, "|", q.questions.length, "questions"));

const badges = await prisma.badge.count();
console.log("\nBadges:", badges);

const tiers = await prisma.pricingTier.findMany({ orderBy: { displayOrder: "asc" } });
console.log("\nPricing Tiers:", tiers.length);
tiers.forEach((t) => console.log("  ", t.slug, "-", t.name, "|", t.status));

await prisma.$disconnect();
pool.end();
