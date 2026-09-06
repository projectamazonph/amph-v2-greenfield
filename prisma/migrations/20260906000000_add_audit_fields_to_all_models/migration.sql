-- Architecture compliance audit 2026-09-06: add deletedAt, createdById,
-- updatedById to all mutable models currently missing them.
--
-- AGENTS.md rule: "Every mutable table has deletedAt, createdById,
-- updatedById. No exceptions."
--
-- Bare String actor ids, no @relation -- same treatment as
-- email_templates.updatedById and resources.createdById/updatedById,
-- the existing precedents in this schema for a "who did this" column.
-- Nullable since rows created before these migrations have neither.

-- User: already has deletedAt; add createdById + updatedById
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- Session
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- SimulatorScenario
ALTER TABLE "simulator_scenarios" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "simulator_scenarios" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "simulator_scenarios" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- LiveClass
ALTER TABLE "live_classes" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "live_classes" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "live_classes" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- LiveClassRegistration
ALTER TABLE "live_class_registrations" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "live_class_registrations" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "live_class_registrations" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- Order
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- PpcCampaign
ALTER TABLE "ppc_campaigns" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "ppc_campaigns" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "ppc_campaigns" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- AuditLog
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- WebhookEvent
ALTER TABLE "webhook_events" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "webhook_events" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "webhook_events" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- XPEvent
ALTER TABLE "xp_events" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "xp_events" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "xp_events" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- ProgressEvent
ALTER TABLE "progress_events" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "progress_events" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "progress_events" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- UserStreak
ALTER TABLE "user_streaks" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "user_streaks" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "user_streaks" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- Quiz
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "quizzes" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- QuizQuestion
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "quiz_questions" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- QuizOption
ALTER TABLE "quiz_options" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "quiz_options" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "quiz_options" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- QuizAttempt
ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "quiz_attempts" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- QuizAttemptAnswer
ALTER TABLE "quiz_attempt_answers" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "quiz_attempt_answers" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "quiz_attempt_answers" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- BadgeAward
ALTER TABLE "badge_awards" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "badge_awards" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "badge_awards" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- EmailVerification
ALTER TABLE "email_verifications" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "email_verifications" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "email_verifications" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- PasswordReset
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- SentReminder
ALTER TABLE "sent_reminders" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "sent_reminders" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "sent_reminders" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- SimulatorAttempt
ALTER TABLE "simulator_attempts" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "simulator_attempts" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "simulator_attempts" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- SimulatorDecision
ALTER TABLE "simulator_decisions" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "simulator_decisions" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "simulator_decisions" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- ScorePolicy
ALTER TABLE "score_policies" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "score_policies" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "score_policies" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- SimulatorScenarioCalibration
ALTER TABLE "simulator_scenario_calibrations" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "simulator_scenario_calibrations" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "simulator_scenario_calibrations" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;

-- EmailTemplate: already has updatedById; add deletedAt + createdById
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "email_templates" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- AttemptFeedback
ALTER TABLE "attempt_feedbacks" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "attempt_feedbacks" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "attempt_feedbacks" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;


-- Certificate
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;


-- EmailLog
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "email_logs" ADD COLUMN IF NOT EXISTS "updatedById" TEXT;
