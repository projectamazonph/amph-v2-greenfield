/**
 * scripts/import-amph-content.ts
 *
 * CLI entry point for seeding the AMPH curriculum from MDX files.
 *
 * Walks `CONTENT_ROOT` (or the default path) for `.mdx` files, parses
 * frontmatter, and upserts Module + Lesson rows into the Postgres
 * database via PrismaModuleRepository / PrismaLessonRepository.
 *
 * Usage:
 *   pnpm import:content
 *   CONTENT_ROOT=/path/to/content pnpm import:content
 *
 * STORY-013.
 *
 * Note: This script is a CLI-only entry point. It does NOT go through
 * the composition container (which is for HTTP request scope). It
 * constructs its own Prisma client and repos so the script can be
 * run from CI / a developer terminal without an active Next.js
 * process.
 */

import { existsSync, readFileSync } from "node:fs";
import { prisma } from "@/infra/database/prisma";
import { PrismaModuleRepository } from "@/infra/repositories/PrismaModuleRepository";
import { PrismaLessonRepository } from "@/infra/repositories/PrismaLessonRepository";
import { PrismaCourseRepository } from "@/infra/repositories/PrismaCourseRepository";
import { NodeContentReader } from "@/infra/content/NodeContentReader";
import { Md5ContentIdGenerator } from "@/infra/system/Md5ContentIdGenerator";
import { ImportAmphContent } from "@/usecases/ImportAmphContent";

// ── Load .env files ────────────────────────────────────────────────────────
// tsx doesn't auto-load .env files the way Next.js does. This is a
// minimal loader: reads .env.local first (Next.js convention), then
// .env, and sets any keys not already in process.env.

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
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function main(): Promise<void> {
  const startTime = Date.now();

  const courseRepo = new PrismaCourseRepository(prisma);
  const moduleRepo = new PrismaModuleRepository(prisma);
  const lessonRepo = new PrismaLessonRepository(prisma);
  const contentReader = new NodeContentReader();
  const idGen = new Md5ContentIdGenerator();

  const useCase = new ImportAmphContent({
    contentReader,
    courseRepo,
    moduleRepo,
    lessonRepo,
    idGen,
  });

  console.log("[import] AMPH curriculum import starting");
  console.log(`[import] CONTENT_ROOT: ${process.env.CONTENT_ROOT ?? "(default)"}`);

  const result = await useCase.execute();

  if (!result.ok) {
    console.error("[import] FAILED");
    console.error(`[import] kind: ${result.error.kind}`);
    console.error(`[import] message: ${result.error.message}`);
    process.exit(1);
  }

  const { coursesCreated, modulesUpserted, lessonsUpserted } = result.value;
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("[import] DONE");
  console.log("[import] courses created:", coursesCreated);
  console.log("[import] modules upserted:", modulesUpserted);
  console.log("[import] lessons upserted:", lessonsUpserted);
  console.log(`[import] elapsed: ${elapsed}s`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("[import] unhandled error:", err);
  process.exit(1);
});
