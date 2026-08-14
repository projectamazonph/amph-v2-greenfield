// Seed Course / Module / Lesson / Quiz / Badge / LiveClass records from the
// MDX content under content/curriculum/modules/.
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve("content/curriculum/modules");

function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    meta[k] = v;
  }
  return { meta, body: m[2] };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: url });
  const p = new PrismaClient({ adapter: new PrismaPg(pool) });

  // Pricing tiers are needed before Course upsert (FK to pricingTierId)
  const tier = await p.pricingTier.findUnique({ where: { slug: "foundations" } });
  const tierMastery = await p.pricingTier.findUnique({ where: { slug: "mastery" } });
  const tierUltimate = await p.pricingTier.findUnique({ where: { slug: "ultimate" } });

  // 1) three courses
  const courseSeeds = [
    {
      slug: "ppc-foundations",
      title: "PPC Foundations",
      tagline: "Read the data, make the call, ship the change.",
      description: "The first course. Read PPC data, make defensible decisions, make the change, write the report. No AI shortcuts.",
      priceMinor: 0,
      pricingTierId: tier?.id ?? null,
      isPublished: true,
      isFeatured: true,
      displayOrder: 1,
      curriculum: { sections: [] },
    },
    {
      slug: "accelerated-mastery",
      title: "Accelerated Mastery",
      tagline: "Six weeks to fluency on the workbench.",
      description: "Two months of applied work. Six modules, two simulators, weekly drills. The bridge from foundation to client work.",
      priceMinor: 599900,
      pricingTierId: tierMastery?.id ?? null,
      isPublished: true,
      isFeatured: false,
      displayOrder: 2,
      curriculum: { sections: [] },
    },
    {
      slug: "ultimate-transformation",
      title: "Ultimate Transformation",
      tagline: "The full bench. From first read to retainer.",
      description: "The full program. All modules, all simulators, all live classes, all assets, and direct instructor review of your client deliverables.",
      priceMinor: 999900,
      pricingTierId: tierUltimate?.id ?? null,
      isPublished: true,
      isFeatured: false,
      displayOrder: 3,
      curriculum: { sections: [] },
    },
  ];

  const courses = {};
  for (const c of courseSeeds) {
    const row = await p.course.upsert({ where: { slug: c.slug }, update: c, create: c });
    courses[c.slug] = row;
    console.log("course", row.slug, row.id);
  }

  // 2) modules + lessons from MDX
  const moduleDirs = fs.readdirSync(ROOT, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const moduleTitleMap = {
    "0-onboarding": "Onboarding",
    "1-foundations": "PPC Foundations",
    "2-keyword-research": "Keyword Research",
    "3-listing-optimization": "Listing Optimization",
    "4-campaign-architecture": "Campaign Architecture",
    "5-portfolio-strategy": "Portfolio Strategy",
    "6-bidding-lab": "Bidding Lab",
    "7-search-term-triage": "Search Term Triage",
    "8-competitive-intelligence": "Competitive Intelligence",
  };

  function moduleToCourseSlug(num) {
    if (num <= 0) return "ppc-foundations";
    if (num <= 3) return "accelerated-mastery";
    return "ultimate-transformation";
  }

  const allLessons = [];
  for (const dir of moduleDirs) {
    const dirPath = path.join(ROOT, dir);
    const mdxFiles = fs.readdirSync(dirPath).filter((f) => f.endsWith(".mdx")).sort();
    const firstSrc = fs.readFileSync(path.join(dirPath, mdxFiles[0]), "utf8");
    const firstMeta = parseFrontmatter(firstSrc).meta;
    const moduleNumber = Number(firstMeta.moduleNumber ?? 0);
    const courseSlug = moduleToCourseSlug(moduleNumber);
    const courseId = courses[courseSlug].id;
    const moduleTitle = moduleTitleMap[dir] ?? dir;

    // Use composite id (courseId+slug) so re-runs don't collide
    const moduleId = `mod_${courseSlug}_${dir}`;
    await p.module.upsert({
      where: { id: moduleId },
      update: { courseId, title: moduleTitle, displayOrder: moduleNumber + 1 },
      create: { id: moduleId, courseId, title: moduleTitle, displayOrder: moduleNumber + 1 },
    });
    console.log("module", dir, "->", courseSlug, moduleId);

    for (let i = 0; i < mdxFiles.length; i++) {
      const f = mdxFiles[i];
      const src = fs.readFileSync(path.join(dirPath, f), "utf8");
      const { meta, body } = parseFrontmatter(src);
      const lessonNumber = Number(meta.lessonNumber ?? i + 1);
      const lessonId = `les_${courseSlug}_${dir}_${f.replace(/\.mdx$/, "")}`;
      const type = String(meta.type ?? "TEXT").toUpperCase();
      const lessonType = ["VIDEO", "TEXT", "QUIZ"].includes(type) ? type : "TEXT";
      await p.lesson.upsert({
        where: { id: lessonId },
        update: {
          moduleId,
          title: meta.title ?? f,
          type: lessonType,
          displayOrder: lessonNumber,
          content: { mdx: body, meta },
        },
        create: {
          id: lessonId,
          moduleId,
          title: meta.title ?? f,
          type: lessonType,
          displayOrder: lessonNumber,
          content: { mdx: body, meta },
        },
      });
      console.log("  lesson", lessonId);
      allLessons.push({ id: lessonId, moduleId, courseId, title: meta.title ?? f, number: lessonNumber });
    }
  }

  // 3) one quiz per course
  const quizTitles = {
    "ppc-foundations": "PPC Foundations — Diagnostic",
    "accelerated-mastery": "Accelerated Mastery — Mid-Program Quiz",
    "ultimate-transformation": "Ultimate Transformation — Capstone Quiz",
  };
  for (const slug of Object.keys(quizTitles)) {
    const course = courses[slug];
    const quizId = `quiz_${slug}`;
    await p.quiz.upsert({
      where: { id: quizId },
      update: { title: quizTitles[slug], passingScore: 70, courseId: course.id },
      create: { id: quizId, title: quizTitles[slug], passingScore: 70, courseId: course.id },
    });
    console.log("quiz", quizId);
  }

  // 4) badges
  const badgeSeeds = [
    { slug: "first-decision", name: "First Decision", description: "Completed your first simulator scenario.", iconName: "Trophy", xpReward: 100, archived: false },
    { slug: "module-finisher", name: "Module Finisher", description: "Finished your first module.", iconName: "Seal", xpReward: 250, archived: false },
    { slug: "course-completer", name: "Course Completer", description: "Finished a full course.", iconName: "Certificate", xpReward: 1000, archived: false },
  ];
  for (const b of badgeSeeds) {
    await p.badge.upsert({ where: { slug: b.slug }, update: b, create: b });
    console.log("badge", b.slug);
  }

  // 5) one live class per course
  const adminUser = await p.user.findFirst({ where: { role: "ADMIN" } });
  const instructorId = adminUser?.id;
  for (const c of Object.values(courses)) {
    const id = `lc_${c.slug}`;
    const startsAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await p.liveClass.upsert({
      where: { id },
      update: {
        courseId: c.id,
        title: `Live: ${c.title} — Q&A`,
        scheduledAt: startsAt,
        durationMinutes: 60,
        instructorId: instructorId ?? "system",
        meetingUrl: "https://meet.example.com/amph-e2e",
        status: "scheduled",
      },
      create: {
        id,
        courseId: c.id,
        title: `Live: ${c.title} — Q&A`,
        scheduledAt: startsAt,
        durationMinutes: 60,
        instructorId: instructorId ?? "system",
        meetingUrl: "https://meet.example.com/amph-e2e",
        status: "scheduled",
      },
    });
    console.log("live class", id);
  }

  // 6) one discount code
  await p.discountCode.upsert({
    where: { code: "E2ETEST" },
    update: { type: "PERCENTAGE", value: 10, maxUses: 100, usedCount: 0, validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) },
    create: { code: "E2ETEST", type: "PERCENTAGE", value: 10, maxUses: 100, usedCount: 0, validUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) },
  });
  console.log("discount E2ETEST");

  console.log("done.");
  await p.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
