/**
 * Prisma 7 config — replaces the url = env("DATABASE_URL") in schema.prisma.
 *
 * In Prisma 7, connection URLs are configured here for the migrate/studio CLI.
 * The application passes the adapter directly to new PrismaClient({ adapter }).
 * See src/infra/database/prisma.ts
 *
 * Run: DATABASE_URL="..." pnpm prisma migrate dev
 *
 * P0-3: shadowDatabaseUrl points to a throwaway DB that prisma migrate
 * diff uses to materialize the migration history. In CI this can be
 * a separate test database; in dev it can be the same URL (Prisma
 * creates and drops a shadow schema with a unique name).
 */

import path from "node:path";
import { defineConfig } from "prisma/config";

const DATABASE_URL = process.env.DATABASE_URL!;
// In dev, default the shadow DB to the same URL (Prisma creates a
// uniquely-named shadow schema). In CI, set SHADOW_DATABASE_URL
// explicitly to a separate test database.
const SHADOW_DATABASE_URL =
  process.env.SHADOW_DATABASE_URL ?? DATABASE_URL;

export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  datasource: {
    url: DATABASE_URL,
    shadowDatabaseUrl: SHADOW_DATABASE_URL,
  },
});
