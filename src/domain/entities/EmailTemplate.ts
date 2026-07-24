/**
 * EmailTemplate — an admin-editable transactional email template.
 *
 * STORY-063: Admin email templates editor.
 *
 * Each template is identified by a stable `type` discriminator
 * (e.g. "email_verification") and carries the four text fields the
 * admin can edit in the UI: subject, headline, introBody, ctaLabel.
 *
 * The actual HTML rendering still lives in
 * `src/infra/email/templates/*.tsx` (React Email components) — the
 * admin template supplies the *content* that the renderer interpolates.
 * The preview route handler at
 * `/admin/api/email-templates/preview?type=...` is responsible for
 * mapping the entity back onto the React Email components for live
 * preview, so the admin sees what the customer will see.
 *
 * Domain rules:
 * - type must be one of the seven known EmailTemplateType values
 * - subject, headline, introBody, ctaLabel must all be non-empty
 *   (whitespace only is rejected)
 * - updatedById is the admin's user id (for audit trail)
 */

import { Result } from "@/domain/shared/Result";

export const EMAIL_TEMPLATE_TYPES = [
  "email_verification",
  "password_reset",
  "welcome",
  "receipt",
  "refund",
  "certificate",
  "live_class_reminder",
] as const;

export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number];

export interface EmailTemplate {
  readonly id: string;
  readonly type: EmailTemplateType;
  readonly subject: string;
  /** Large H1-style line shown at the top of the email body. */
  readonly headline: string;
  /** 1–3 sentence intro paragraph between the headline and the CTA button. */
  readonly introBody: string;
  /** Text shown on the primary call-to-action button. */
  readonly ctaLabel: string;
  readonly updatedAt: Date;
  readonly updatedById: string;
}

export type CreateEmailTemplateError = { kind: "invalid_input"; message: string };

export interface CreateEmailTemplateParams {
  id: string;
  type: EmailTemplateType;
  subject: string;
  headline: string;
  introBody: string;
  ctaLabel: string;
  updatedById: string;
  updatedAt?: Date;
}

/** Type guard — does the given string identify a known template type? */
export function isEmailTemplateType(value: string): value is EmailTemplateType {
  return (EMAIL_TEMPLATE_TYPES as readonly string[]).includes(value);
}

/**
 * Domain factory: create a new EmailTemplate.
 *
 * Trims each text field and rejects empty/whitespace-only values.
 * The id is supplied by the caller (ULID via composition container).
 */
export function createEmailTemplate(
  params: CreateEmailTemplateParams,
): Result<EmailTemplate, CreateEmailTemplateError> {
  if (!params.id.trim()) {
    return Result.err({ kind: "invalid_input", message: "id is required" });
  }
  if (!params.updatedById.trim()) {
    return Result.err({ kind: "invalid_input", message: "updatedById is required" });
  }

  const subject = params.subject.trim();
  if (!subject) {
    return Result.err({ kind: "invalid_input", message: "subject must not be empty" });
  }

  const headline = params.headline.trim();
  if (!headline) {
    return Result.err({ kind: "invalid_input", message: "headline must not be empty" });
  }

  const introBody = params.introBody.trim();
  if (!introBody) {
    return Result.err({ kind: "invalid_input", message: "introBody must not be empty" });
  }

  const ctaLabel = params.ctaLabel.trim();
  if (!ctaLabel) {
    return Result.err({ kind: "invalid_input", message: "ctaLabel must not be empty" });
  }

  return Result.ok(
    Object.freeze({
      id: params.id.trim(),
      type: params.type,
      subject,
      headline,
      introBody,
      ctaLabel,
      updatedAt: params.updatedAt ?? new Date(),
      updatedById: params.updatedById.trim(),
    }),
  );
}

// ── Update ───────────────────────────────────────────────────────────

export type UpdateEmailTemplatePatch = Partial<
  Pick<EmailTemplate, "subject" | "headline" | "introBody" | "ctaLabel">
>;

export type UpdateEmailTemplateError = { kind: "invalid_input"; message: string };

/**
 * Apply a patch to an existing EmailTemplate.
 *
 * Returns a new (frozen) instance. The type, id, updatedById and
 * updatedAt fields cannot be patched here — updatedAt is always
 * overridden by the use case, and updatedById is updated by the use
 * case (set to the calling admin's id). Type is immutable (the type
 * is the row's primary key in the DB).
 *
 * Whitespace-only values are rejected the same way as on creation.
 */
export function updateEmailTemplate(
  original: EmailTemplate,
  patch: UpdateEmailTemplatePatch,
  newUpdatedById: string,
  newUpdatedAt: Date = new Date(),
): Result<EmailTemplate, UpdateEmailTemplateError> {
  if (!newUpdatedById.trim()) {
    return Result.err({ kind: "invalid_input", message: "updatedById is required" });
  }

  const subject = patch.subject !== undefined ? patch.subject.trim() : original.subject;
  if (!subject) {
    return Result.err({ kind: "invalid_input", message: "subject must not be empty" });
  }

  const headline = patch.headline !== undefined ? patch.headline.trim() : original.headline;
  if (!headline) {
    return Result.err({ kind: "invalid_input", message: "headline must not be empty" });
  }

  const introBody = patch.introBody !== undefined ? patch.introBody.trim() : original.introBody;
  if (!introBody) {
    return Result.err({ kind: "invalid_input", message: "introBody must not be empty" });
  }

  const ctaLabel = patch.ctaLabel !== undefined ? patch.ctaLabel.trim() : original.ctaLabel;
  if (!ctaLabel) {
    return Result.err({ kind: "invalid_input", message: "ctaLabel must not be empty" });
  }

  return Result.ok(
    Object.freeze({
      id: original.id,
      type: original.type,
      subject,
      headline,
      introBody,
      ctaLabel,
      updatedAt: newUpdatedAt,
      updatedById: newUpdatedById.trim(),
    }),
  );
}
