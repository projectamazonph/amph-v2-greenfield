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

export interface EmailTemplateVariable {
  readonly name: string;
  readonly label: string;
}

/**
 * Variables an admin can use inside `{{doubleBraces}}` for each template.
 * Values are escaped by React Email when rendered, so dynamic values remain
 * text even when an admin places them in body copy.
 */
export const EMAIL_TEMPLATE_VARIABLES: Readonly<
  Record<EmailTemplateType, readonly EmailTemplateVariable[]>
> = Object.freeze({
  email_verification: [
    { name: "firstName", label: "Student first name" },
    { name: "verificationUrl", label: "Verification link" },
    { name: "expiresInHours", label: "Link expiry (hours)" },
  ],
  password_reset: [
    { name: "firstName", label: "Student first name" },
    { name: "resetUrl", label: "Password reset link" },
    { name: "expiresInMinutes", label: "Link expiry (minutes)" },
  ],
  welcome: [
    { name: "firstName", label: "Student first name" },
    { name: "dashboardUrl", label: "Dashboard link" },
  ],
  receipt: [
    { name: "firstName", label: "Student first name" },
    { name: "orderNumber", label: "Order number" },
    { name: "courseTitle", label: "Course title" },
    { name: "amount", label: "Amount paid" },
    { name: "paidAt", label: "Payment date" },
    { name: "receiptUrl", label: "Receipt link" },
  ],
  refund: [
    { name: "firstName", label: "Student first name" },
    { name: "orderNumber", label: "Order number" },
    { name: "courseTitle", label: "Course title" },
    { name: "amount", label: "Refund amount" },
    { name: "refundedAt", label: "Refund date" },
    { name: "reason", label: "Refund reason" },
    { name: "dashboardUrl", label: "Dashboard link" },
  ],
  certificate: [
    { name: "firstName", label: "Student first name" },
    { name: "courseTitle", label: "Course title" },
    { name: "verificationHash", label: "Certificate verification hash" },
    { name: "verifyUrl", label: "Public certificate link" },
  ],
  live_class_reminder: [
    { name: "firstName", label: "Student first name" },
    { name: "classTitle", label: "Live class title" },
    { name: "startsAt", label: "Class start time" },
    { name: "joinUrl", label: "Class join link" },
    { name: "minutesUntilStart", label: "Minutes until start" },
  ],
});

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

export interface ResolvedEmailTemplate {
  readonly subject: string;
  readonly headlineOverride: string;
  readonly introBodyOverride: string;
  readonly ctaLabelOverride: string;
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-z][a-zA-Z0-9]*)\s*\}\}/g;

function validatePlaceholders(type: EmailTemplateType, field: string, value: string): string | null {
  const withoutPlaceholders = value.replace(PLACEHOLDER_PATTERN, "");
  if (withoutPlaceholders.includes("{{") || withoutPlaceholders.includes("}}")) {
    return `${field} has a malformed placeholder. Use {{variableName}}.`;
  }

  const allowed = new Set(EMAIL_TEMPLATE_VARIABLES[type].map((variable) => variable.name));
  for (const match of value.matchAll(PLACEHOLDER_PATTERN)) {
    const name = match[1];
    if (!name || !allowed.has(name)) {
      return `${field} uses {{${name ?? ""}}}, which is not available for the ${type} template.`;
    }
  }

  return null;
}

function validateTemplatePlaceholders(
  type: EmailTemplateType,
  fields: Pick<EmailTemplate, "subject" | "headline" | "introBody" | "ctaLabel">,
): string | null {
  for (const [field, value] of Object.entries(fields)) {
    const error = validatePlaceholders(type, field, value);
    if (error) return error;
  }
  return null;
}

/** Resolve the template's validated placeholders for one recipient. */
export function interpolateEmailTemplate(
  template: Pick<EmailTemplate, "subject" | "headline" | "introBody" | "ctaLabel">,
  variables: Readonly<Record<string, string>>,
): ResolvedEmailTemplate {
  const interpolate = (value: string) =>
    value.replace(PLACEHOLDER_PATTERN, (match, name: string) => variables[name] ?? match);

  return Object.freeze({
    subject: interpolate(template.subject),
    headlineOverride: interpolate(template.headline),
    introBodyOverride: interpolate(template.introBody),
    ctaLabelOverride: interpolate(template.ctaLabel),
  });
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

  const placeholderError = validateTemplatePlaceholders(params.type, {
    subject,
    headline,
    introBody,
    ctaLabel,
  });
  if (placeholderError) {
    return Result.err({ kind: "invalid_input", message: placeholderError });
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

  const placeholderError = validateTemplatePlaceholders(original.type, {
    subject,
    headline,
    introBody,
    ctaLabel,
  });
  if (placeholderError) {
    return Result.err({ kind: "invalid_input", message: placeholderError });
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
