/**
 * Prisma 7 config — replaces the url = env("DATABASE_URL") in schema.prisma.
 *
 * In Prisma 7, connection URLs are configured here for the migrate/studio CLI.
 * The application passes the adapter directly to new PrismaClient({ adapter }).
 * See src/infra/database/prisma.ts
 *
 * Run: DATABASE_URL="..." pnpm prisma migrate dev
 */

import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
});
