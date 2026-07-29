import pg from "pg";
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Add currentSessionVersion column if missing
await p.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "currentSessionVersion" INTEGER NOT NULL DEFAULT 0
`);

// Verify
const r = await p.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'currentSessionVersion'
`);
console.log("currentSessionVersion column:", r.rows.length === 1 ? "present" : "missing");

await p.end();
