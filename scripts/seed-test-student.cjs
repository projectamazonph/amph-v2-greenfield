// Smoke-test student seed. Creates a plain STUDENT user we can log in as during E2E.
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { PrismaClient } = require("@prisma/client");
const argon2 = require("argon2");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const p = new PrismaClient({ adapter });
  const passwordHash = await argon2.hash("Student12345!");
  const u = await p.user.upsert({
    where: { email: "student@amph.local" },
    update: { password: passwordHash, emailVerifiedAt: new Date() },
    create: {
      email: "student@amph.local",
      firstName: "Test",
      lastName: "Student",
      password: passwordHash,
      role: "STUDENT",
      emailVerifiedAt: new Date(),
    },
  });
  console.log("student upsert", u.id, u.email);
  await p.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
