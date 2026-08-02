/**
 * GetEmailTemplate — fetch a single email template's current content
 * by its type discriminator.
 *
 * STORY-095. `template: null` in the success value means the type is
 * known but has never been customized (no DB row yet) — this is not
 * an error, the admin edit form just starts blank.
 */
import { Result } from "@/domain/shared/Result";
import {
  isEmailTemplateType,
  type EmailTemplate,
  type EmailTemplateType,
} from "@/domain/entities/EmailTemplate";
import type { IEmailTemplateRepository } from "@/ports/repositories/IEmailTemplateRepository";

export interface GetEmailTemplateInput {
  type: string;
}

export type GetEmailTemplateError =
  { kind: "invalid_type" } | { kind: "db_error"; message: string };
export type GetEmailTemplateResult = Result<
  { type: EmailTemplateType; template: EmailTemplate | null },
  GetEmailTemplateError
>;

export interface GetEmailTemplateDeps {
  emailTemplateRepo: IEmailTemplateRepository;
}

export class GetEmailTemplate {
  constructor(private readonly deps: GetEmailTemplateDeps) {}

  async execute(input: GetEmailTemplateInput): Promise<GetEmailTemplateResult> {
    if (!isEmailTemplateType(input.type)) {
      return Result.err({ kind: "invalid_type" });
    }

    const found = await this.deps.emailTemplateRepo.findByType(input.type);
    if (!found.ok) {
      return Result.err({ kind: "db_error", message: found.error.message });
    }

    return Result.ok({ type: input.type, template: found.value });
  }
}
