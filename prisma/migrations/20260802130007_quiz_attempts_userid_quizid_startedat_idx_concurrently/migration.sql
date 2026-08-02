-- prisma-migrate-disable-next-transaction
-- Proposal 7: widens quiz_attempts' (userId, quizId) index to
-- (userId, quizId, startedAt) — findByUserAndQuiz() and
-- findLatestByUserAndQuiz() both filter on {userId, quizId} and sort
-- by startedAt desc, which the 2-column index couldn't satisfy
-- without an extra sort step.
-- Postgres refuses CREATE INDEX CONCURRENTLY inside a transaction
-- block, so this file opts out of Prisma's default per-migration
-- transaction wrapper and contains only this one statement.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "quiz_attempts_userId_quizId_startedAt_idx" ON "quiz_attempts"("userId", "quizId", "startedAt");
