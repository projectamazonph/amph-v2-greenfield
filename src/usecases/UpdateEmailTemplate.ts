/**
 * UpdateEmailTemplate — admin creates or edits an email template's
 * content (upsert-by-type).
 *
 * STORY-095. If no row exists yet for the type, this creates one; if
 * a row exists, it's patched. Either path validates via the domain
 * factory functions (non-empty subject/headline/introBody/ctaLabel)
 * and records an audit log entry on success.
 */
import { Result } from "@/domain/shared/Result";
import {
  createEmailTemplate,
  isEmailTemplateType,
  updateEmailTemplate,
  type EmailTemplate,
} from "@/domain/entities/EmailTemplate";
import type { IEmailTemplateRepository } from "@/ports/repositories/IEmailTemplateRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface UpdateEmailTemplateInput {
  type: string;
  subject: string;
  headline: string;
  introBody: string;
  ctaLabel: string;
  actorId: string;
}

export type UpdateEmailTemplateError =
  | { kind: "invalid_type" }
  | { kind: "invalid_input"; message: string }
  | { kind: "db_error"; message: string };
export type UpdateEmailTemplateResult = Result<
  { template: EmailTemplate },
  UpdateEmailTemplateError
>;

export interface UpdateEmailTemplateDeps {
  emailTemplateRepo: IEmailTemplateRepository;
  recordAuditLog: RecordAuditLog;
  idGen: IdGenerator;
  clock: Clock;
}

export class UpdateEmailTemplate {
  constructor(private readonly deps: UpdateEmailTemplateDeps) {}

  async execute(input: UpdateEmailTemplateInput): Promise<UpdateEmailTemplateResult> {
    if (!isEmailTemplateType(input.type)) {
      return Result.err({ kind: "invalid_type" });
    }

    const found = await this.deps.emailTemplateRepo.findByType(input.type);
    if (!found.ok) {
      return Result.err({ kind: "db_error", message: found.error.message });
    }

    const patch = {
      subject: input.subject,
      headline: input.headline,
      introBody: input.introBody,
      ctaLabel: input.ctaLabel,
    };

    const built = found.value
      ? updateEmailTemplate(found.value, patch, input.actorId, this.deps.clock.now())
      : createEmailTemplate({
          id: this.deps.idGen.newId(),
          type: input.type,
          ...patch,
          updatedById: input.actorId,
          updatedAt: this.deps.clock.now(),
        });

    if (!built.ok) {
      return Result.err({ kind: "invalid_input", message: built.error.message });
    }

    const saved = await this.deps.emailTemplateRepo.upsert(built.value);
    if (!saved.ok) {
      return Result.err({ kind: "db_error", message: saved.error.message });
    }

    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "email_template.updated",
      targetType: "email_template",
      targetId: input.type,
      metadata: { type: input.type },
    });

    return Result.ok({ template: built.value });
  }
}
