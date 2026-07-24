/**
 * `GetEmailTemplate` — fetch a single email template by its `type`.
 *
 * STORY-063.
 *
 * Returns `not_found` if the type is unknown OR the row hasn't been
 * seeded yet. The use case does NOT validate the type itself — that
 * is the responsibility of the caller's `isEmailTemplateType`
 * guard (e.g. the dynamic route handler) — but the repo's
 * `findByType` is a string lookup so an invalid type just returns
 * `null` here, which we translate into `not_found`.
 */

import type { Result } from "@/domain/shared/Result";
import type { EmailTemplate } from "@/domain/entities/EmailTemplate";
import type {
  IEmailTemplateRepository,
  EmailTemplateError,
} from "@/ports/repositories/IEmailTemplateRepository";

export type GetEmailTemplateError = { kind: "not_found" } | EmailTemplateError;
export type GetEmailTemplateResult = Result<{ template: EmailTemplate }, GetEmailTemplateError>;

export class GetEmailTemplate {
  constructor(private readonly deps: { emailTemplateRepo: IEmailTemplateRepository }) {}

  async execute(type: string): Promise<GetEmailTemplateResult> {
    const r = await this.deps.emailTemplateRepo.findByType(type);
    if (!r.ok) return r;
    if (r.value === null) {
      return { ok: false, error: { kind: "not_found" } };
    }
    return { ok: true, value: { template: r.value } };
  }
}
