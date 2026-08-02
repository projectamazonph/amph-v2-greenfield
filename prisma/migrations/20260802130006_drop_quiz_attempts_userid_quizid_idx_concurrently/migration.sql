-- prisma-migrate-disable-next-transaction
-- Proposal 7: dropping the old 2-column (userId, quizId) index ahead
-- of replacing it with a 3-column (userId, quizId, startedAt) index
-- in the next migration — see that file for the rationale.
-- Postgres refuses DROP INDEX CONCURRENTLY inside a transaction
-- block, so this file opts out of Prisma's default per-migration
-- transaction wrapper and contains only this one statement.

DROP INDEX CONCURRENTLY IF EXISTS "quiz_attempts_userId_quizId_idx";
