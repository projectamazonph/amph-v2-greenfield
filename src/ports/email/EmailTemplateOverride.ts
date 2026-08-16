/**
 * EmailTemplateOverride — optional admin-customized copy from
 * `EmailTemplate` (STORY-095.5), threaded into a renderer's `render()`
 * args. When a field is omitted, the renderer falls back to its
 * hardcoded default copy. Shared across every renderer port whose
 * `EmailTemplateType` is admin-editable.
 *
 * Template content is resolved with the type-specific `{{placeholder}}`
 * variables declared by `EmailTemplate` before reaching this port.
 */

export interface EmailTemplateOverride {
  headlineOverride?: string;
  introBodyOverride?: string;
  ctaLabelOverride?: string;
}
