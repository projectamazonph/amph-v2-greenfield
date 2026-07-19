/**
 * E2E seed helpers — STORY-055.
 *
 * These helpers talk directly to the test database so E2E specs can
 * set up state quickly without driving the UI for setup steps.
 */

export async function clearE2EUsers(databaseUrl: string): Promise<void> {
  process.env.DATABASE_URL = databaseUrl;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.user.deleteMany({
      where: { email: { contains: "@example.com" } },
    });
  } finally {
    await prisma.$disconnect();
  }
}
