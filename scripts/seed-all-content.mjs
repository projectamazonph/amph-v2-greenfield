/**
 * scripts/seed-all-content.mjs
 *
 * Comprehensive seed script for AMPH v2 curriculum content.
 * Creates courses, modules, lessons, quizzes, and badges in one pass.
 *
 * Usage: pnpm tsx scripts/seed-all-content.mjs
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { createHash } from "node:crypto";
import matter from "gray-matter";

// ── Load env ─────────────────────────────────────────────────────────────────
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

// ── Prisma setup ─────────────────────────────────────────────────────────────
const { PrismaClient } = await import("@prisma/client");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { Pool } = await import("pg");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is not set. Check .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Helpers ──────────────────────────────────────────────────────────────────
function md5(...parts) {
  return createHash("md5").update(parts.join(":")).digest("hex");
}

function deriveTitle(dirSlug) {
  return dirSlug
    .replace(/^\d+-/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function courseSlugForModule(n) {
  if (n >= 0 && n <= 4) return "ppc-foundations";
  if (n >= 5 && n <= 8) return "accelerated-mastery";
  return null;
}

function mapLessonType(t) {
  if (t === "reading" || t === "text") return "TEXT";
  if (t === "video") return "VIDEO";
  if (t === "quiz") return "QUIZ";
  return "TEXT";
}

// ── Content root ─────────────────────────────────────────────────────────────
const CONTENT_ROOT = join(process.cwd(), "content", "curriculum", "modules");

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: COURSES
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n[seed] === Step 1: Courses ===");

const COURSES = [
  {
    slug: "ppc-foundations",
    title: "PPC Foundations",
    tagline: "You can support a safe Sponsored Products launch and explain the numbers behind it.",
    description: "Build a listing-readiness checklist, a profitability and max-CPC worksheet, a keyword map, and a campaign-build rationale.",
    priceMinor: 299900,
    tier: "foundations",
  },
  {
    slug: "accelerated-mastery",
    title: "Accelerated Mastery",
    tagline: "You can run a structured weekly optimization cycle and report the outcome.",
    description: "Build a search-term action log, a bid-change plan, a budget decision log, and a one-page client report.",
    priceMinor: 599900,
    tier: "accelerated",
  },
  {
    slug: "ultimate-transformation",
    title: "Ultimate Transformation",
    tagline: "You can present a small account plan and operate like a dependable junior PPC specialist.",
    description: "Build a reviewed portfolio, a recorded walkthrough, and an interview-ready story.",
    priceMinor: 999900,
    tier: "ultimate",
  },
];

const courseIds = {};
for (const c of COURSES) {
  const id = md5("course", c.slug);
  courseIds[c.slug] = id;
  await prisma.course.upsert({
    where: { slug: c.slug },
    update: {
      title: c.title,
      tagline: c.tagline,
      description: c.description,
      priceMinor: c.priceMinor,
      currency: "PHP",
    },
    create: {
      id,
      slug: c.slug,
      title: c.title,
      tagline: c.tagline,
      description: c.description,
      priceMinor: c.priceMinor,
      currency: "PHP",
      isPublished: true,
      isFeatured: c.slug === "ppc-foundations",
      displayOrder: COURSES.indexOf(c) + 1,
      curriculum: {
        sections: [
          {
            id: "stub-section",
            title: "Curriculum",
            lessons: [{ id: "stub-lesson", title: "See modules", type: "TEXT", content: { body: "" } }],
          },
        ],
      },
    },
  });
  console.log(`  [course] ${c.slug} → ready (id: ${id.slice(0, 8)}...)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: MODULES + LESSONS from MDX
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n[seed] === Step 2: Modules + Lessons ===");

if (!existsSync(CONTENT_ROOT)) {
  console.error(`  Content directory not found: ${CONTENT_ROOT}`);
  process.exit(1);
}

const moduleDirs = readdirSync(CONTENT_ROOT).filter((d) => {
  const p = join(CONTENT_ROOT, d);
  return existsSync(p) && statSync(p).isDirectory();
});

let modulesCreated = 0;
let lessonsCreated = 0;

// Accumulates each course's real curriculum (Sections + embedded Lessons) as
// we walk the MDX files, so it can be written to Course.curriculum after this
// loop. This is the JSON the student-facing lesson page and the
// AuthorizeLessonAccess use case actually read — the Module/Lesson tables
// populated below are a separate, admin-facing read model (STORY-048) and are
// not consulted by that flow. Without this, Course.curriculum stays the
// placeholder stub set in Step 1 and every lesson link 404s.
const curriculumSectionsByCourse = { "ppc-foundations": [], "accelerated-mastery": [] };

for (const dirName of moduleDirs.sort()) {
  const dirPath = join(CONTENT_ROOT, dirName);
  const mdxFiles = readdirSync(dirPath)
    .filter((f) => extname(f) === ".mdx")
    .sort();

  if (mdxFiles.length === 0) continue;

  // Parse first file to get module number
  const firstRaw = readFileSync(join(dirPath, mdxFiles[0]), "utf-8");
  const firstParsed = matter(firstRaw);
  const moduleNumber = firstParsed.data.moduleNumber;
  const courseSlug = courseSlugForModule(moduleNumber);
  if (!courseSlug) {
    console.log(`  [skip] ${dirName} — unknown module number ${moduleNumber}`);
    continue;
  }

  const moduleId = md5("module", courseSlug, String(moduleNumber));
  const moduleTitle = deriveTitle(dirName);
  const courseId = courseIds[courseSlug];

  // Upsert module
  await prisma.module.upsert({
    where: { id: moduleId },
    update: { title: moduleTitle, displayOrder: moduleNumber + 1 },
    create: {
      id: moduleId,
      courseId,
      title: moduleTitle,
      displayOrder: moduleNumber + 1,
    },
  });
  modulesCreated++;

  // Process lessons
  const curriculumLessons = [];
  for (const fileName of mdxFiles) {
    const filePath = join(dirPath, fileName);
    const raw = readFileSync(filePath, "utf-8");
    const parsed = matter(raw);
    const fm = parsed.data;

    const lessonType = mapLessonType(fm.type);
    const lessonId = md5("lesson", moduleId, fm.slug);

    const content =
      lessonType === "VIDEO"
        ? { durationMinutes: fm.estimatedMinutes || 10 }
        : { body: parsed.content };

    await prisma.lesson.upsert({
      where: { id: lessonId },
      update: {
        title: fm.title,
        type: lessonType,
        content,
        displayOrder: fm.lessonNumber,
      },
      create: {
        id: lessonId,
        moduleId,
        title: fm.title,
        type: lessonType,
        content,
        displayOrder: fm.lessonNumber,
      },
    });
    lessonsCreated++;

    // Same id/title/type as the Lesson row above, so links generated from
    // either read model resolve to the same lesson. `content.type` is
    // embedded redundantly because LessonContent.tsx (the student-facing
    // renderer) discriminates on it — see LessonContent.test.tsx and
    // getLessonData.test.ts fixtures for the expected shape.
    curriculumLessons.push({
      id: lessonId,
      title: fm.title,
      type: lessonType,
      content: { type: lessonType, ...content },
    });
  }

  curriculumSectionsByCourse[courseSlug].push({
    id: moduleId,
    title: moduleTitle,
    lessons: curriculumLessons,
  });

  console.log(
    `  [module] ${dirName} → ${moduleTitle} (${mdxFiles.length} lessons, course: ${courseSlug})`,
  );
}

console.log(`  Total: ${modulesCreated} modules, ${lessonsCreated} lessons`);

// Write the accumulated curriculum to each course, replacing the Step-1 stub.
for (const [courseSlug, sections] of Object.entries(curriculumSectionsByCourse)) {
  if (sections.length === 0) continue;
  await prisma.course.update({
    where: { id: courseIds[courseSlug] },
    data: { curriculum: { sections } },
  });
  const lessonCount = sections.reduce((n, s) => n + s.lessons.length, 0);
  console.log(
    `  [curriculum] ${courseSlug} → ${sections.length} sections, ${lessonCount} lessons`,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: QUIZZES from quiz-questions.json
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n[seed] === Step 3: Quizzes ===");

const quizPath = join(process.cwd(), "content", "curriculum", "quiz-questions.json");
if (!existsSync(quizPath)) {
  console.log("  No quiz-questions.json found, skipping.");
} else {
  const quizData = JSON.parse(readFileSync(quizPath, "utf-8"));
  let quizzesCreated = 0;
  let questionsCreated = 0;

  for (const quizDef of quizData.quizzes) {
    const courseSlug =
      quizDef.moduleNumber >= 0 && quizDef.moduleNumber <= 4
        ? "ppc-foundations"
        : quizDef.moduleNumber >= 5 && quizDef.moduleNumber <= 8
          ? "accelerated-mastery"
          : null;

    if (!courseSlug) {
      console.log(`  [skip] quiz module ${quizDef.moduleNumber} — unknown course`);
      continue;
    }

    const courseId = courseIds[courseSlug];
    const quizId = md5("quiz", courseSlug, String(quizDef.moduleNumber));

    // Upsert quiz
    await prisma.quiz.upsert({
      where: { id: quizId },
      update: {
        title: quizDef.title,
        passingScore: quizData._meta.passThreshold || 70,
      },
      create: {
        id: quizId,
        courseId,
        title: quizDef.title,
        passingScore: quizData._meta.passThreshold || 70,
      },
    });
    quizzesCreated++;

    // Delete existing questions for this quiz (clean re-seed)
    await prisma.quizOption.deleteMany({
      where: { question: { quizId } },
    });
    await prisma.quizQuestion.deleteMany({ where: { quizId } });

    // Create questions + options
    for (const q of quizDef.questions) {
      const questionId = md5("question", quizId, String(q.order));

      await prisma.quizQuestion.create({
        data: {
          id: questionId,
          quizId,
          questionText: q.question,
          order: q.order,
        },
      });

      const options = [
        { letter: "A", text: q.optionA },
        { letter: "B", text: q.optionB },
        { letter: "C", text: q.optionC },
        { letter: "D", text: q.optionD },
      ];

      for (let i = 0; i < options.length; i++) {
        await prisma.quizOption.create({
          data: {
            id: md5("option", questionId, options[i].letter),
            questionId,
            optionText: options[i].text,
            isCorrect: options[i].letter === q.correctAnswer,
            order: i + 1,
          },
        });
      }
      questionsCreated++;
    }

    console.log(
      `  [quiz] ${quizDef.title} (${quizDef.questions.length} questions, course: ${courseSlug})`,
    );
  }

  console.log(`  Total: ${quizzesCreated} quizzes, ${questionsCreated} questions`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4: BADGES
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n[seed] === Step 4: Badges ===");

const BADGES = [
  {
    slug: "first-lesson",
    name: "First Step",
    description: "Completed your first lesson.",
    iconName: "Footprints",
    xpReward: 25,
  },
  {
    slug: "first-quiz-pass",
    name: "Quiz Rookie",
    description: "Passed your first quiz.",
    iconName: "CheckCircle",
    xpReward: 50,
  },
  {
    slug: "module-complete",
    name: "Module Master",
    description: "Completed all lessons in a module.",
    iconName: "GraduationCap",
    xpReward: 100,
  },
  {
    slug: "streak-3",
    name: "Three-Day Streak",
    description: "Logged in and completed a lesson three days in a row.",
    iconName: "Flame",
    xpReward: 75,
  },
  {
    slug: "streak-7",
    name: "Week Warrior",
    description: "Seven-day learning streak.",
    iconName: "Lightning",
    xpReward: 150,
  },
  {
    slug: "first-simulation",
    name: "Sim Starter",
    description: "Completed your first simulator scenario.",
    iconName: "GameController",
    xpReward: 50,
  },
  {
    slug: "perfect-quiz",
    name: "Perfect Score",
    description: "Scored 100% on a quiz.",
    iconName: "Star",
    xpReward: 100,
  },
  {
    slug: "course-complete",
    name: "Course Champion",
    description: "Completed all modules in a course.",
    iconName: "Trophy",
    xpReward: 200,
  },
  {
    slug: "all-courses",
    name: "PPC Specialist",
    description: "Completed all three courses.",
    iconName: "Crown",
    xpReward: 500,
  },
  {
    slug: "first-tool-use",
    name: "Tool Time",
    description: "Used one of the PPC tools for the first time.",
    iconName: "Wrench",
    xpReward: 25,
  },
];

for (const b of BADGES) {
  await prisma.badge.upsert({
    where: { slug: b.slug },
    update: { name: b.name, description: b.description, iconName: b.iconName, xpReward: b.xpReward },
    create: b,
  });
  console.log(`  [badge] ${b.slug} → ${b.name}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5: PRICING TIERS
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n[seed] === Step 5: Pricing Tiers ===");

const TIERS = [
  {
    slug: "foundations",
    name: "PPC Foundations",
    priceMinor: 299900,
    currency: "PHP",
    status: "ACTIVE",
    displayOrder: 1,
  },
  {
    slug: "accelerated",
    name: "Accelerated Mastery",
    priceMinor: 599900,
    currency: "PHP",
    status: "ACTIVE",
    displayOrder: 2,
  },
  {
    slug: "ultimate",
    name: "Ultimate Transformation",
    priceMinor: 999900,
    currency: "PHP",
    status: "ACTIVE",
    displayOrder: 3,
  },
];

for (const t of TIERS) {
  await prisma.pricingTier.upsert({
    where: { slug: t.slug },
    update: { name: t.name, priceMinor: t.priceMinor, status: t.status },
    create: t,
  });
  console.log(`  [tier] ${t.slug} → ${t.name} (PHP ${(t.priceMinor / 100).toLocaleString()})`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DONE
// ═══════════════════════════════════════════════════════════════════════════════
console.log("\n[seed] === ALL DONE ===");
console.log(`  Courses: ${COURSES.length}`);
console.log(`  Modules: ${modulesCreated}`);
console.log(`  Lessons: ${lessonsCreated}`);
console.log(`  Badges: ${BADGES.length}`);
console.log(`  Pricing Tiers: ${TIERS.length}`);

await prisma.$disconnect();
process.exit(0);
