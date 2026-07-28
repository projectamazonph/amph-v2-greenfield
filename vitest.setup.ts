/**
 * vitest.setup.ts — global test setup.
 *
 * Sets dummy env vars for tests that import the production container
 * transitively (via action files importing `buildContainer`). The tests
 * that need a real DB use `buildTestContainer` and never touch `prisma`.
 * The dummy URL just needs to be syntactically valid so module-level
 * `createPrismaClient()` doesn't throw at import time.
 */
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET ??= "test-secret-at-least-32-bytes-long-please";
process.env.PAYMONGO_SECRET ??= "sk_test_dummy";
process.env.PAYMONGO_WEBHOOK_SECRET ??= "whsec_test_dummy";
process.env.RESEND_API_KEY ??= "re_test_dummy";
process.env.EMAIL_VERIFICATION_SECRET ??= "test-verification-secret";
