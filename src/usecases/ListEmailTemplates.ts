/**
 * ListEmailTemplates — list all known email template types with their
 * current admin-authored content, if any.
 *
 * STORY-095. Always returns exactly the 7 known EMAIL_TEMPLATE_TYPES,
 * in fixed order, pairing each with its DB row (or null if the admin
 * has never customized that type yet).
 */
import { Result } from "@/domain/shared/Result";
import {
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplate,
  type EmailTemplateType,
} from "@/domain/entities/EmailTemplate";
import type { IEmailTemplateRepository } from "@/ports/repositories/IEmailTemplateRepository";

export interface EmailTemplateListRow {
  type: EmailTemplateType;
  template: EmailTemplate | null;
}

export type ListEmailTemplatesError = { kind: "db_error"; message: string };
export type ListEmailTemplatesResult = Result<
  { rows: readonly EmailTemplateListRow[] },
  ListEmailTemplatesError
>;

export interface ListEmailTemplatesDeps {
  emailTemplateRepo: IEmailTemplateRepository;
}

export class ListEmailTemplates {
  constructor(private readonly deps: ListEmailTemplatesDeps) {}

  async execute(): Promise<ListEmailTemplatesResult> {
    const found = await this.deps.emailTemplateRepo.listAll();
    if (!found.ok) {
      return Result.err({ kind: "db_error", message: found.error.message });
    }

    const byType = new Map(found.value.map((t) => [t.type, t]));
    const rows: EmailTemplateListRow[] = EMAIL_TEMPLATE_TYPES.map((type) => ({
      type,
      template: byType.get(type) ?? null,
    }));

    return Result.ok({ rows });
  }
}
