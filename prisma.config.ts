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
 * diff uses to materialize the migration history. We only set it
 * when SHADOW_DATABASE_URL is explicitly provided — otherwise Prisma
 * refuses to run with the shadow DB equal to the main DB.
 */

import path from "node:path";
import { defineConfig } from "prisma/config";

const DATABASE_URL = process.env.DATABASE_URL!;
const SHADOW_DATABASE_URL = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  datasource: {
    url: DATABASE_URL,
    ...(SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: SHADOW_DATABASE_URL }
      : {}),
  },
});
