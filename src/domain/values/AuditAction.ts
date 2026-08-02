/**
 * AuditAction — the discriminator for what an audit log entry
 * represents.
 *
 * STORY-050a. String union. Add to this as new audit-worthy
 * events are introduced.
 *
 * Convention: `{aggregate}.{verb}`. Past tense.
 */

export type AuditAction =
  // Course
  | "course.created"
  | "course.updated"
  | "course.archived"
  // Module
  | "module.created"
  | "module.updated"
  | "module.deleted"
  | "module.reordered"
  | "module.create_failed"
  | "module.update_failed"
  | "module.delete_failed"
  | "module.reorder_failed"
  // Lesson
  | "lesson.created"
  | "lesson.updated"
  | "lesson.deleted"
  | "lesson.reordered"
  | "lesson.create_failed"
  | "lesson.update_failed"
  | "lesson.delete_failed"
  | "lesson.reorder_failed"
  // Payment / refund
  | "refund.processed"
  | "refund.overridden"
  // User
  | "user.signed_up"
  | "user.impersonated"
  | "user.stopped_impersonating"
  | "user.2fa_enabled"
  | "user.2fa_disabled"
  | "user.account_deleted"
  | "user.data_exported"
  // Admin manual subscription-tier grant (bypasses checkout)
  | "user.subscription_granted"
  // Discount code
  | "discount_code.created"
  | "discount_code.updated"
  | "discount_code.archived"
  | "discount_code.create_failed"
  | "discount_code.update_failed"
  | "discount_code.archive_failed"
  // Badge
  | "badge.created"
  | "badge.updated"
  | "badge.archived"
  | "badge.create_failed"
  | "badge.update_failed"
  | "badge.archive_failed"
  // Simulator / Live class
  | "simulator.created"
  | "simulator.updated"
  | "simulator.archived"
  | "simulator_attempt.started"
  | "live_class.created"
  | "live_class.updated"
  | "live_class.deleted"
  | "live_class.create_failed"
  | "live_class.update_failed"
  | "live_class.delete_failed"
  // Email template
  | "email_template.updated"
  // Quiz (STORY-091)
  | "quiz.created"
  | "quiz.updated"
  | "quiz.deleted"
  | "quiz.create_failed"
  | "quiz.update_failed"
  | "quiz.delete_failed"
  // Certificate (STORY-044 + STORY-092)
  | "certificate.revoked";

/**
 * STORY-061. All valid AuditAction values as an array.
 * Used by the admin UI to populate the action filter dropdown.
 */
export const ALL_ACTIONS: AuditAction[] = [
  "course.created",
  "course.updated",
  "course.archived",
  "module.created",
  "module.updated",
  "module.deleted",
  "module.reordered",
  "module.create_failed",
  "module.update_failed",
  "module.delete_failed",
  "module.reorder_failed",
  "lesson.created",
  "lesson.updated",
  "lesson.deleted",
  "lesson.reordered",
  "lesson.create_failed",
  "lesson.update_failed",
  "lesson.delete_failed",
  "lesson.reorder_failed",
  "refund.processed",
  "refund.overridden",
  "user.signed_up",
  "user.impersonated",
  "user.stopped_impersonating",
  "user.2fa_enabled",
  "user.2fa_disabled",
  "user.account_deleted",
  "user.data_exported",
  "user.subscription_granted",
  "discount_code.created",
  "discount_code.updated",
  "discount_code.archived",
  "discount_code.create_failed",
  "discount_code.update_failed",
  "discount_code.archive_failed",
  "badge.created",
  "badge.updated",
  "badge.archived",
  "badge.create_failed",
  "badge.update_failed",
  "badge.archive_failed",
  "simulator.created",
  "simulator.updated",
  "simulator.archived",
  "simulator_attempt.started",
  "live_class.created",
  "live_class.updated",
  "live_class.deleted",
  "live_class.create_failed",
  "live_class.update_failed",
  "live_class.delete_failed",
  // STORY-063: email template
  "email_template.updated",
  // STORY-091: quiz admin CRUD
  "quiz.created",
  "quiz.updated",
  "quiz.deleted",
  "quiz.create_failed",
  "quiz.update_failed",
  "quiz.delete_failed",
  // STORY-044 + STORY-092: certificate revoke
  "certificate.revoked",
];

/**
 * STORY-061. Type guard — returns true if the string is a valid AuditAction.
 * Used to safely coerce user-supplied / persisted action strings.
 */
export function isAuditAction(value: string): value is AuditAction {
  return (ALL_ACTIONS as readonly string[]).includes(value);
}
