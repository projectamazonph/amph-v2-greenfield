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
  // Lesson
  | "lesson.created"
  | "lesson.updated"
  | "lesson.deleted"
  | "lesson.reordered"
  // Payment / refund
  | "refund.processed"
  | "refund.overridden"
  // User
  | "user.impersonated"
  | "user.stopped_impersonating"
  // Discount code
  | "discount_code.created"
  | "discount_code.updated"
  | "discount_code.archived"
  // Badge
  | "badge.created"
  | "badge.updated"
  | "badge.archived"
  // Simulator / Live class
  | "simulator.created"
  | "simulator.updated"
  | "simulator.archived"
  | "live_class.created"
  | "live_class.updated"
  | "live_class.deleted"
  | "live_class.create_failed"
  | "live_class.update_failed"
  | "live_class.delete_failed";
