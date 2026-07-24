/**
 * `UpdateEmailTemplate` — admin updates an existing email template.
 *
 * STORY-063.
 *
 * Flow:
 *  1. Validate the `type` is a known EmailTemplateType.
 *  2. Build the patched entity via `updateEmailTemplate` (re-checks
 *     non-empty text fields).
 *  3. Upsert the new state to the repository.
 *  4. Record an audit log entry (best-effort; RecordAuditLog swallows).
 *
 * If no row currently exists for the type, the upsert creates one
 * (so the editor can be used to seed missing templates as well as
 * update existing ones).
 */

import { Result } from "@/domain/shared/Result";
import {
  isEmailTemplateType,
  updateEmailTemplate,
  type UpdateEmailTemplatePatch,
} from "@/domain/entities/EmailTemplate";
import type {
  IEmailTemplateRepository,
  EmailTemplateError,
} from "@/ports/repositories/IEmailTemplateRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface UpdateEmailTemplateInput {
  type: string;
  patch: UpdateEmailTemplatePatch;
  actorId: string;
}

export type UpdateEmailTemplateError =
  | { kind: "invalid_type" }
  | { kind: "invalid_input"; message: string }
  | { kind: "not_found" } // type is valid but no existing row AND the upsert
  // surfaced a not-found (shouldn't happen with
  // upsert, but reserved for future partial-success
  // modes)
  | EmailTemplateError;

export type UpdateEmailTemplateResult = Result<{ templateType: string }, UpdateEmailTemplateError>;

export class UpdateEmailTemplate {
  constructor(
    private readonly deps: {
      emailTemplateRepo: IEmailTemplateRepository;
      idGen: IdGenerator;
      clock: Clock;
      recordAuditLog: RecordAuditLog;
    },
  ) {}

  async execute(input: UpdateEmailTemplateInput): Promise<UpdateEmailTemplateResult> {
    if (!isEmailTemplateType(input.type)) {
      return Result.err({ kind: "invalid_type" });
    }
    if (!input.actorId.trim()) {
      return Result.err({ kind: "invalid_input", message: "actorId is required" });
    }

    const now = this.deps.clock.now();

    // Fetch the existing row (or null) so `updateEmailTemplate` can
    // merge the patch with the prior state.
    const existingResult = await this.deps.emailTemplateRepo.findByType(input.type);
    let base;
    if (!existingResult.ok) {
      return existingResult as unknown as UpdateEmailTemplateResult;
    }
    if (existingResult.value !== null) {
      base = existingResult.value;
    } else {
      // No prior row — seed a "blank" entity that the patch will
      // fully replace. The factory would reject empty fields, so
      // we skip it and go straight to building a new instance.
      const id = this.deps.idGen.newId();
      const buildResult = updateEmailTemplate(
        // A minimal stand-in template for the no-prior-row case.
        // updatedById here is only used for the very first save
        // (when no patch field is provided, this value is kept).
        {
          id,
          type: input.type,
          subject: "",
          headline: "",
          introBody: "",
          ctaLabel: "",
          updatedAt: now,
          updatedById: input.actorId,
        },
        input.patch,
        input.actorId,
        now,
      );
      if (!buildResult.ok) {
        void this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action: "email_template.updated",
          targetType: "email_template",
          targetId: input.type,
          metadata: { error: buildResult.error.kind, mode: "create" },
        });
        return buildResult as unknown as UpdateEmailTemplateResult;
      }
      const persistResult = await this.deps.emailTemplateRepo.upsert(buildResult.value);
      if (!persistResult.ok) {
        return persistResult as unknown as UpdateEmailTemplateResult;
      }
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "email_template.updated",
        targetType: "email_template",
        targetId: input.type,
        metadata: {
          mode: "create",
          subject: buildResult.value.subject,
          headline: buildResult.value.headline,
          introBody: buildResult.value.introBody,
          ctaLabel: buildResult.value.ctaLabel,
        },
      });
      return Result.ok({ templateType: input.type });
    }

    const buildResult = updateEmailTemplate(base, input.patch, input.actorId, now);
    if (!buildResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "email_template.updated",
        targetType: "email_template",
        targetId: input.type,
        metadata: { error: buildResult.error.kind, mode: "update" },
      });
      return buildResult as unknown as UpdateEmailTemplateResult;
    }

    const persistResult = await this.deps.emailTemplateRepo.upsert(buildResult.value);
    if (!persistResult.ok) {
      return persistResult as unknown as UpdateEmailTemplateResult;
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "email_template.updated",
      targetType: "email_template",
      targetId: input.type,
      metadata: {
        mode: "update",
        before: {
          subject: base.subject,
          headline: base.headline,
          introBody: base.introBody,
          ctaLabel: base.ctaLabel,
        },
        after: {
          subject: buildResult.value.subject,
          headline: buildResult.value.headline,
          introBody: buildResult.value.introBody,
          ctaLabel: buildResult.value.ctaLabel,
        },
      },
    });

    return Result.ok({ templateType: input.type });
  }
}
