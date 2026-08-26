/**
 * NodeContentReader — production adapter for IAmphContentReader.
 *
 * Walks the filesystem, reads every `.mdx` file under `contentRoot`,
 * parses frontmatter with gray-matter, and returns them grouped by
 * course slug.
 *
 * STORY-013.
 */

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import { Result } from "@/domain/shared/Result";
import type {
  IAmphContentReader,
  MdxFile,
  MdxFrontmatter,
} from "@/domain/ports/content/IAmphContentReader";
import type { ContentReadError } from "@/domain/ports/content/IAmphContentReader";

/**
 * Maps a module number to the owning course slug.
 *   0–4 → "ppc-foundations"
 *   5–10 → "accelerated-mastery"
 *   11 → "ultimate-transformation"
 */
function courseSlugForModule(moduleNumber: number): string | null {
  if (moduleNumber >= 0 && moduleNumber <= 4) return "ppc-foundations";
  if (moduleNumber >= 5 && moduleNumber <= 10) return "accelerated-mastery";
  if (moduleNumber === 11) return "ultimate-transformation";
  return null;
}

export class NodeContentReader implements IAmphContentReader {
  async readAll(): Promise<
    Result<readonly { courseSlug: string; files: readonly MdxFile[] }[], ContentReadError>
  > {
    const contentRoot = resolveContentRoot();

    if (!existsSync(contentRoot)) {
      return Result.err({
        kind: "read_error",
        message: `Content directory not found: ${contentRoot}`,
      });
    }

    const result: Map<string, MdxFile[]> = new Map();

    // Walk each module directory
    let moduleDirs: string[];
    try {
      moduleDirs = readdirSync(contentRoot);
    } catch (err: unknown) {
      return Result.err({
        kind: "read_error",
        message: `Cannot read content directory: ${String(err)}`,
      });
    }

    for (const dirName of moduleDirs) {
      const dirPath = join(contentRoot, dirName);

      // Skip files at the root level
      let stats;
      try {
        stats = statSync(dirPath);
      } catch {
        continue;
      }
      if (!stats.isDirectory()) continue;

      // Read all .mdx files in this module directory
      let mdxFiles: string[];
      try {
        mdxFiles = readdirSync(dirPath).filter((f) => extname(f) === ".mdx");
      } catch (err) {
        return Result.err({
          kind: "read_error",
          message: `Cannot read module directory ${dirName}: ${String(err)}`,
        });
      }

      for (const fileName of mdxFiles) {
        const filePath = join(dirPath, fileName);
        const parseResult = this.parseFile(dirName, fileName, filePath);
        if (!parseResult.ok) return parseResult;

        const file = parseResult.value;
        const courseSlug = courseSlugForModule(file.frontmatter.moduleNumber);
        if (!courseSlug) continue; // skip unknown module numbers

        if (!result.has(courseSlug)) result.set(courseSlug, []);
        result.get(courseSlug)!.push(file);
      }
    }

    // Sort each course's files by (moduleNumber, lessonNumber)
    const groups = [...result.entries()]
      .map(([courseSlug, files]) => ({
        courseSlug,
        files: [...files].sort((a, b) => {
          const mDiff = a.frontmatter.moduleNumber - b.frontmatter.moduleNumber;
          if (mDiff !== 0) return mDiff;
          return a.frontmatter.lessonNumber - b.frontmatter.lessonNumber;
        }),
      }))
      .sort((a, b) => a.courseSlug.localeCompare(b.courseSlug));

    return Result.ok(groups);
  }

  private parseFile(
    dirSlug: string,
    fileName: string,
    filePath: string,
  ): Result<MdxFile, ContentReadError> {
    let raw: string;
    try {
      raw = readFileSync(filePath, "utf-8");
    } catch (err: unknown) {
      return Result.err({
        kind: "read_error",
        message: `Cannot read file ${filePath}: ${String(err)}`,
        file: filePath,
      });
    }

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(raw);
    } catch (err: unknown) {
      return Result.err({
        kind: "parse_error",
        message: `Failed to parse frontmatter: ${String(err)}`,
        file: filePath,
      });
    }

    const fm = parsed.data as Record<string, unknown>;

    // Validate required frontmatter fields
    const errors: string[] = [];
    const getStr = (k: string) => {
      const v = fm[k];
      if (typeof v !== "string" || !v.trim()) errors.push(`"${k}" must be a non-empty string`);
      return typeof v === "string" ? v.trim() : "";
    };
    const getNum = (k: string) => {
      const v = fm[k];
      if (typeof v !== "number" || !Number.isFinite(v)) {
        errors.push(`"${k}" must be a finite number`);
        return 0;
      }
      return v as number;
    };

    const title = getStr("title");
    const slug = getStr("slug");
    const type = getStr("type");
    const moduleNumber = getNum("moduleNumber");
    const lessonNumber = getNum("lessonNumber");
    const estimatedMinutes = getNum("estimatedMinutes");
    const xpReward = getNum("xpReward");

    if (errors.length > 0) {
      return Result.err({
        kind: "parse_error",
        message: errors.join("; "),
        file: filePath,
      });
    }

    // Strip extension from filename for the fileSlug
    const fileSlug = fileName.replace(/\.mdx$/, "");

    const frontmatter: MdxFrontmatter = {
      title,
      slug,
      moduleNumber,
      lessonNumber,
      type,
      estimatedMinutes,
      xpReward,
    };

    return Result.ok({
      dirSlug,
      fileSlug,
      frontmatter,
      body: parsed.content,
    });
  }
}

/**
 * Resolves the content root directory.
 * Uses CONTENT_ROOT env var if set; otherwise computes the path
 * relative to the project root (three levels up from this file's
 * directory, which lives at src/infra/content/).
 */
function resolveContentRoot(): string {
  if (process.env.CONTENT_ROOT) return process.env.CONTENT_ROOT;

  const __dirname = dirname(fileURLToPath(import.meta.url));
  // This file is at <project-root>/src/infra/content/, so go up 3 levels
  const projectRoot = resolve(__dirname, "..", "..", "..");
  return join(projectRoot, "content", "curriculum", "modules");
}
