/**
 * IAmphContentReader — port for reading and parsing the AMPH curriculum
 * MDX content directory.
 *
 * Abstracts filesystem traversal + MDX frontmatter parsing so
 * ImportAmphContent stays testable without touching the real filesystem.
 *
 * STORY-013.
 */

import type { Result } from "@/domain/shared/Result";

/** Frontmatter fields present in every AMPH lesson MDX file. */
export interface MdxFrontmatter {
  readonly title: string;
  readonly slug: string; // e.g. "1.1-read-ppc-data-before-you-change-it"
  readonly moduleNumber: number; // 0–8
  readonly lessonNumber: number; // 1–N
  readonly type: string; // "reading" → TEXT, "video" → VIDEO, etc.
  readonly estimatedMinutes: number;
  readonly xpReward: number;
}

/** A single parsed MDX file from the content directory. */
export interface MdxFile {
  readonly dirSlug: string; // e.g. "1-foundations"
  readonly fileSlug: string; // e.g. "1.1-read-ppc-data-before-you-change-it"
  readonly frontmatter: MdxFrontmatter;
  /** Raw MDX body after the frontmatter separator. */
  readonly body: string;
}

export type ContentReadError =
  { kind: "read_error"; message: string } | { kind: "parse_error"; message: string; file: string };

export interface IAmphContentReader {
  /**
   * Walk the content directory and return all discovered MDX files
   * grouped by course slug.
   *
   * Each group's files are sorted by (moduleNumber asc, lessonNumber asc).
   *
   * The `courseSlug` is derived from the module number:
   *   0–4 → "ppc-foundations"
   *   5–8 → "accelerated-mastery"
   *
   * Files whose moduleNumber falls outside both ranges are skipped
   * (they are not an error — the source content may grow beyond the
   * current two-course structure).
   *
   * Implementations read the content root from their own configuration
   * (e.g. env var or constructor argument), not from this method.
   */
  readAll(): Promise<
    Result<readonly { courseSlug: string; files: readonly MdxFile[] }[], ContentReadError>
  >;
}
