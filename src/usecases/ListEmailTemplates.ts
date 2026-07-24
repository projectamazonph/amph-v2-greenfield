/**
 * `ListEmailTemplates` — list all admin-editable email templates.
 *
 * STORY-063.
 *
 * Thin pass-through to the repository. The order is stable (sorted
 * by `type` ascending in both adapters) so the admin UI can render
 * the rows in the same order every time.
 */

import { Result } from "@/domain/shared/Result";
import type { EmailTemplate } from "@/domain/entities/EmailTemplate";
import type {
  IEmailTemplateRepository,
  EmailTemplateError,
} from "@/ports/repositories/IEmailTemplateRepository";

export type ListEmailTemplatesResult = Result<
  { templates: readonly EmailTemplate[] },
  EmailTemplateError
>;

export class ListEmailTemplates {
  constructor(private readonly deps: { emailTemplateRepo: IEmailTemplateRepository }) {}

  async execute(): Promise<ListEmailTemplatesResult> {
    const r = await this.deps.emailTemplateRepo.listAll();
    if (!r.ok) return r;
    return Result.ok({ templates: r.value });
  }
}
