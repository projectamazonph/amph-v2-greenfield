/**
 * PrismaCourseRepository — production adapter for CourseRepository.
 *
 * P0-2 fix: course data (titles, descriptions, curriculum, pricing)
 * was previously in-process and vanished on restart. This adapter
 * persists courses to PostgreSQL via Prisma so that two application
 * instances observe the same catalog.
 *
 * The Course domain uses a `curriculum: Curriculum` structured type
 * and a `status: "DRAFT" | "PUBLISHED" | "ARCHIVED"` enum. The Prisma
 * model stores `curriculum: Json` and `isPublished: Boolean`. The
 * mapRow() / mapData() helpers translate between the two:
 *
 *   Curriculum      ↔ Json (the JSON IS the curriculum)
 *   isPublished=true, status=ARCHIVED  ← cannot represent (DB-level
 *                                         state is binary; DRAFT vs
 *                                         ARCHIVED are both !isPublished)
 *
 * Because of that last constraint, ARCHIVED is encoded in the
 * `displayOrder` field (negative = archived). This is a known
 * limitation; the audit's P1-7 calls out the broader
 * curriculum-data-model question. A future story should add an
 * `archivedAt: DateTime?` column to the schema to make status
 * first-class.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  CourseRepository,
  CourseError,
} from "@/ports/repositories/CourseRepository";
import type { Course, Curriculum, LessonType } from "@/domain/entities/Course";

interface PrismaCourseRow {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  priceMinor: number;
  currency: string;
  curriculum: unknown; // Json — runtime validation happens below
  coverImage: string | null;
  isPublished: boolean;
  isFeatured: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PrismaCourseRepository implements CourseRepository {
  constructor(private readonly db: PrismaClient) {}

  async listPublished(): Promise<Result<readonly Course[], CourseError>> {
    try {
      const rows = await this.db.course.findMany({
        where: { isPublished: true, displayOrder: { gte: 0 } },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      });
      return Result.ok(rows.map((r) => this.mapRow(r as PrismaCourseRow)));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async listAll(): Promise<Result<readonly Course[], CourseError>> {
    try {
      const rows = await this.db.course.findMany({
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      });
      return Result.ok(rows.map((r) => this.mapRow(r as PrismaCourseRow)));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Course, CourseError>> {
    try {
      const row = await this.db.course.findUnique({ where: { id } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row as PrismaCourseRow));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findBySlug(slug: string): Promise<Result<Course, CourseError>> {
    try {
      const row = await this.db.course.findUnique({ where: { slug } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row as PrismaCourseRow));
    } catch (err) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(course: Course): Promise<Result<Course, CourseError>> {
    try {
      // Slug uniqueness including archived (negative displayOrder).
      const existing = await this.db.course.findFirst({ where: { slug: course.slug } });
      if (existing) {
        return Result.err({ kind: "slug_taken" });
      }
      const row = await this.db.course.create({
        data: this.mapData(course),
      });
      return Result.ok(this.mapRow(row as PrismaCourseRow));
    } catch (err) {
      // Prisma unique-constraint violation on slug.
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2002") {
        return Result.err({ kind: "slug_taken" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(course: Course): Promise<Result<Course, CourseError>> {
    try {
      // Enforce slug uniqueness excluding self.
      const existing = await this.db.course.findFirst({
        where: { slug: course.slug, NOT: { id: course.id } },
      });
      if (existing) {
        return Result.err({ kind: "slug_taken" });
      }
      const row = await this.db.course.update({
        where: { id: course.id },
        data: this.mapData(course),
      });
      return Result.ok(this.mapRow(row as PrismaCourseRow));
    } catch (err) {
      if (err && typeof err === "object" && "code" in err) {
        const code = (err as { code: string }).code;
        if (code === "P2025") {
          return Result.err({ kind: "not_found" });
        }
        if (code === "P2002") {
          return Result.err({ kind: "slug_taken" });
        }
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async archive(id: string): Promise<Result<Course, CourseError>> {
    try {
      // Idempotent archive: if already archived (negative displayOrder),
      // return the existing course without error.
      const existing = await this.db.course.findUnique({ where: { id } });
      if (!existing) return Result.err({ kind: "not_found" });
      if ((existing as PrismaCourseRow).displayOrder < 0) {
        return Result.ok(this.mapRow(existing as PrismaCourseRow));
      }
      const row = await this.db.course.update({
        where: { id },
        data: { displayOrder: -Math.abs((existing as PrismaCourseRow).displayOrder || 1) - 1, isPublished: false },
      });
      return Result.ok(this.mapRow(row as PrismaCourseRow));
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025") {
        return Result.err({ kind: "not_found" });
      }
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  // ── mappers ────────────────────────────────────────────

  private mapData(course: Course): {
    id: string;
    slug: string;
    title: string;
    tagline: string;
    description: string;
    priceMinor: number;
    currency: string;
    curriculum: Prisma.InputJsonValue;
    coverImage: string | null;
    isPublished: boolean;
    isFeatured: boolean;
    displayOrder: number;
  } {
    return {
      id: course.id,
      slug: course.slug,
      title: course.title,
      tagline: course.tagline,
      description: course.description,
      priceMinor: course.price.minor,
      currency: course.price.currency,
      curriculum: course.curriculum as unknown as Prisma.InputJsonValue,
      coverImage: course.coverImage,
      isPublished: course.status === "PUBLISHED",
      isFeatured: course.isFeatured,
      // Encode ARCHIVED as negative displayOrder; the in-memory repo
      // uses the same convention (ARCHIVED is status=ARCHIVED; we
      // map it to displayOrder < 0 for DB persistence since the
      // schema doesn't have a status column). See class doc above.
      displayOrder:
        course.status === "ARCHIVED"
          ? -Math.abs(course.displayOrder || 1) - 1
          : course.displayOrder,
    };
  }

  private mapRow(row: PrismaCourseRow): Course {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      tagline: row.tagline,
      description: row.description,
      price: {
        minor: row.priceMinor,
        currency: row.currency as "PHP",
      } as Course["price"],
      curriculum: this.parseCurriculum(row.curriculum),
      coverImage: row.coverImage,
      isFeatured: row.isFeatured,
      displayOrder: Math.abs(row.displayOrder),
      status: this.mapStatus(row),
      // The Prisma schema doesn't yet have courseTier / previewLessonCount.
      // The audit's P1-7 calls out adding these; for now we hardcode
      // the preview tier so the page doesn't break.
      courseTier: "STARTER" as Course["courseTier"],
      previewLessonCount: 1,
      createdAt: row.createdAt,
    };
  }

  private mapStatus(row: PrismaCourseRow): "DRAFT" | "PUBLISHED" | "ARCHIVED" {
    if (row.displayOrder < 0) return "ARCHIVED";
    if (row.isPublished) return "PUBLISHED";
    return "DRAFT";
  }

  private parseCurriculum(raw: unknown): Curriculum {
    // Defensive: the JSON column could contain anything. The factory
    // would reject an empty curriculum; this parser returns a
    // minimal-valid empty curriculum on malformed input.
    if (!raw || typeof raw !== "object") {
      return { sections: [] };
    }
    const obj = raw as { sections?: unknown };
    if (!Array.isArray(obj.sections)) {
      return { sections: [] };
    }
    const sections = obj.sections.flatMap((s: unknown) => {
      if (!s || typeof s !== "object") return [];
      const section = s as { id?: unknown; title?: unknown; lessons?: unknown };
      if (typeof section.id !== "string" || typeof section.title !== "string") {
        return [];
      }
      if (!Array.isArray(section.lessons)) {
        return [{ id: section.id, title: section.title, lessons: [] }];
      }
      const lessons = section.lessons.flatMap((l: unknown) => {
        if (!l || typeof l !== "object") return [];
        const lesson = l as { id?: unknown; title?: unknown; type?: unknown; content?: unknown };
        if (typeof lesson.id !== "string" || typeof lesson.title !== "string") {
          return [];
        }
        const t = lesson.type;
        if (t !== "VIDEO" && t !== "TEXT" && t !== "QUIZ") {
          return [];
        }
        return [{ id: lesson.id, title: lesson.title, type: t as LessonType, content: lesson.content ?? {} }];
      });
      return [{ id: section.id, title: section.title, lessons }];
    });
    return { sections };
  }
}
