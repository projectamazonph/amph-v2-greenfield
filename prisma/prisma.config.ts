import path from "node:path";
import type { PrismaConfig } from "prisma";

export default {
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),

  migrate: {
    async adapter() {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { Pool } = await import("pg");

      // Prisma 7 requires a pg Pool adapter — uses DATABASE_URL from env
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL is not set");
      }

      const pool = new Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },

  studio: {
    async adapter() {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { Pool } = await import("pg");

      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error("DATABASE_URL is not set");
      }

      const pool = new Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
} satisfies PrismaConfig;
