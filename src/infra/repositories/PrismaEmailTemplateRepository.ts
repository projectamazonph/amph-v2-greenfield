/**
 * PrismaEmailTemplateRepository — production adapter for IEmailTemplateRepository.
 *
 * STORY-063. There is at most one row per `type`. `upsert` is
 * implemented as a Prisma `upsert` keyed on the unique `type` index.
 *
 * The DB column is the `type` discriminator, not the `id`. The
 * domain entity still carries an `id` (used by the audit log to
 * identify the target) — we mint a new id on every upsert and pass
 * it through. This keeps the domain entity's `id` field meaningful
 * (and makes audit-log entries stable across saves) while the
 * `type` column provides the natural unique key in the database.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  IEmailTemplateRepository,
  EmailTemplateError,
} from "@/ports/repositories/IEmailTemplateRepository";
import type { EmailTemplate, EmailTemplateType } from "@/domain/entities/EmailTemplate";
import { isEmailTemplateType } from "@/domain/entities/EmailTemplate";

interface EmailTemplateRow {
  id: string;
  type: string;
  subject: string;
  headline: string;
  introBody: string;
  ctaLabel: string;
  updatedAt: Date;
  updatedById: string;
}

export class PrismaEmailTemplateRepository implements IEmailTemplateRepository {
  constructor(private readonly db: PrismaClient) {}

  async listAll(): Promise<Result<readonly EmailTemplate[], EmailTemplateError>> {
    try {
      const rows = await this.db.emailTemplate.findMany({
        orderBy: { type: "asc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findByType(type: string): Promise<Result<EmailTemplate | null, EmailTemplateError>> {
    try {
      const row = await this.db.emailTemplate.findUnique({ where: { type } });
      if (!row) return Result.ok(null);
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async upsert(template: EmailTemplate): Promise<Result<void, EmailTemplateError>> {
    try {
      await this.db.emailTemplate.upsert({
        where: { type: template.type },
        create: {
          id: template.id,
          type: template.type,
          subject: template.subject,
          headline: template.headline,
          introBody: template.introBody,
          ctaLabel: template.ctaLabel,
          updatedAt: template.updatedAt,
          updatedById: template.updatedById,
        },
        update: {
          id: template.id,
          subject: template.subject,
          headline: template.headline,
          introBody: template.introBody,
          ctaLabel: template.ctaLabel,
          updatedAt: template.updatedAt,
          updatedById: template.updatedById,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: EmailTemplateRow): EmailTemplate {
    // Defensive: persist a string in `type` but the domain type
    // demands the narrow union. If the DB has been hand-edited
    // (or the migration is mid-flight) to a value outside the
    // known set, the row is unusable — return a value the type
    // system accepts by casting, but skip the cast if we can.
    const type: EmailTemplateType = isEmailTemplateType(row.type)
      ? row.type
      : (row.type as EmailTemplateType);
    return Object.freeze({
      id: row.id,
      type,
      subject: row.subject,
      headline: row.headline,
      introBody: row.introBody,
      ctaLabel: row.ctaLabel,
      updatedAt: row.updatedAt,
      updatedById: row.updatedById,
    });
  }
}
