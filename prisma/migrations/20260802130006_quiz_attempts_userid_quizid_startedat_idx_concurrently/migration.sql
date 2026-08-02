-- prisma-migrate-disable-next-transaction
-- Proposal 7: widens quiz_attempts' (userId, quizId) index to
-- (userId, quizId, startedAt) — findByUserAndQuiz() and
-- findLatestByUserAndQuiz() both filter on {userId, quizId} and sort
-- by startedAt desc, which the 2-column index couldn't satisfy
-- without an extra sort step.
--
-- Deliberately created BEFORE the old 2-column index is dropped (see
-- the next migration) — CREATE INDEX CONCURRENTLY can take minutes on
-- a large table, and dropping the old index first would leave a
-- window with no supporting index for these query patterns at all.
--
-- Postgres refuses CREATE INDEX CONCURRENTLY inside a transaction
-- block, so this file opts out of Prisma's default per-migration
-- transaction wrapper and contains only this one statement.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "quiz_attempts_userId_quizId_startedAt_idx" ON "quiz_attempts"("userId", "quizId", "startedAt");
