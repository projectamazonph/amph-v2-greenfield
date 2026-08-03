/**
 * EmailTemplateOverride — optional admin-customized copy from
 * `EmailTemplate` (STORY-095.5), threaded into a renderer's `render()`
 * args. When a field is omitted, the renderer falls back to its
 * hardcoded default copy. Shared across every renderer port whose
 * `EmailTemplateType` is admin-editable.
 *
 * Note: `EmailTemplate` has no `{{placeholder}}` syntax — an override
 * replaces the corresponding line verbatim, so per-recipient
 * interpolation (e.g. the student's first name) is lost when a field
 * is customized. That's a property of the domain model, not this type.
 */

export interface EmailTemplateOverride {
  headlineOverride?: string;
  introBodyOverride?: string;
  ctaLabelOverride?: string;
}
