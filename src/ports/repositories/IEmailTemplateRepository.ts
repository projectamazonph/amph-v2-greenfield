/**
 * IEmailTemplateRepository — port for persisting and querying email templates.
 *
 * STORY-063: Admin email templates editor.
 *
 * Each row in the underlying table is keyed by `type` (the
 * EmailTemplateType discriminator). There is at most one row per type.
 * `listAll()` returns every row in deterministic (insertion / type
 * alphabetical) order; `findByType()` returns a single row or null;
 * `upsert()` inserts or replaces a row in a single call.
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { EmailTemplate } from "@/domain/entities/EmailTemplate";

/** Only the catch-all "we couldn't reach the DB" error today. */
export type EmailTemplateError = { kind: "db_error"; message: string };

export interface IEmailTemplateRepository {
  /**
   * List all email templates (all 7 known types), ordered by `type`
   * ascending for stable UI rendering.
   */
  listAll(): Promise<Result<readonly EmailTemplate[], EmailTemplateError>>;

  /**
   * Find a single template by its `type` discriminator. Returns
   * `null` if no template with that type exists.
   */
  findByType(type: string): Promise<Result<EmailTemplate | null, EmailTemplateError>>;

  /**
   * Insert-or-replace by `type`. The caller is responsible for
   * having already run domain validation (`createEmailTemplate` or
   * `updateEmailTemplate`); the repo trusts the entity it receives.
   */
  upsert(template: EmailTemplate): Promise<Result<void, EmailTemplateError>>;
}
