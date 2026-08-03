-- prisma-migrate-disable-next-transaction
-- Proposal 7: drops the old 2-column (userId, quizId) index, now that
-- the previous migration has already built its 3-column replacement
-- (userId, quizId, startedAt) — see that file for the rationale.
-- Postgres refuses DROP INDEX CONCURRENTLY inside a transaction
-- block, so this file opts out of Prisma's default per-migration
-- transaction wrapper and contains only this one statement.

DROP INDEX CONCURRENTLY IF EXISTS "quiz_attempts_userId_quizId_idx";
