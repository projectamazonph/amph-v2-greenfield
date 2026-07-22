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
  | "user.impersonated"
  | "user.stopped_impersonating"
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
  | "live_class.created"
  | "live_class.updated"
  | "live_class.deleted"
  | "live_class.create_failed"
  | "live_class.update_failed"
  | "live_class.delete_failed";
