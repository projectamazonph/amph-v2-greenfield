// Dump dynamic IDs the E2E walk needs.
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: url });
  const p = new PrismaClient({ adapter: new PrismaPg(pool) });

  const courses = await p.course.findMany({ select: { id: true, slug: true, title: true } });
  console.log("=== COURSES ===");
  for (const c of courses) console.log(`${c.id}\t${c.slug}\t${c.title}`);

  const modules = await p.module.findMany({ select: { id: true, courseId: true, title: true } });
  console.log("=== MODULES ===");
  for (const m of modules) console.log(`${m.id}\t${m.courseId}\t${m.title}`);

  const lessons = await p.lesson.findMany({ select: { id: true, moduleId: true, title: true } });
  console.log("=== LESSONS ===");
  for (const l of lessons) console.log(`${l.id}\t${l.moduleId}\t${l.title}`);

  const quizzes = await p.quiz.findMany({ select: { id: true, title: true, courseId: true } });
  console.log("=== QUIZZES ===");
  for (const q of quizzes) console.log(`${q.id}\t${q.courseId ?? ""}\t${q.title}`);

  const liveClasses = await p.liveClass.findMany({ select: { id: true, title: true, courseId: true } });
  console.log("=== LIVE_CLASSES ===");
  for (const lc of liveClasses) console.log(`${lc.id}\t${lc.courseId}\t${lc.title}`);

  const resources = await p.resource.findMany({ select: { id: true, title: true } });
  console.log("=== RESOURCES ===");
  for (const r of resources) console.log(`${r.id}\t${r.title}`);

  const scenarios = await p.simulatorScenario.findMany({ select: { id: true, simulatorId: true, name: true, scenarioKey: true, status: true, difficulty: true } });
  console.log("=== SCENARIOS ===");
  for (const sc of scenarios) console.log(`${sc.id}\t${sc.simulatorId}\t${sc.difficulty}\t${sc.status}\t${sc.scenarioKey}\t${sc.name}`);

  const badges = await p.badge.findMany({ select: { slug: true, name: true } });
  console.log("=== BADGES ===");
  for (const b of badges) console.log(`${b.slug}\t${b.name}`);

  const users = await p.user.findMany({ select: { id: true, email: true, role: true, firstName: true, lastName: true } });
  console.log("=== USERS ===");
  for (const u of users) console.log(`${u.id}\t${u.role}\t${u.firstName} ${u.lastName}\t${u.email}`);

  const discounts = await p.discountCode.findMany({ select: { id: true, code: true } });
  console.log("=== DISCOUNTS ===");
  for (const d of discounts) console.log(`${d.id}\t${d.code}`);

  const tiers = await p.pricingTier.findMany({ select: { id: true, slug: true, name: true } });
  console.log("=== PRICING_TIERS ===");
  for (const t of tiers) console.log(`${t.id}\t${t.slug}\t${t.name}`);

  await p.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
