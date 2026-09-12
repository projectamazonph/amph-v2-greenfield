// Temporary production diagnostic. Deleted after use.
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const r = await client.query(
  `SELECT id, email, role, "verificationStatus", "lockedUntil",
          "failedLoginCount", "twoFactorEnabled",
          (password <> '') AS "hasPassword"
   FROM users WHERE email = $1`,
  ["ryandabao@gmail.com"],
);
console.log(JSON.stringify(r.rows, null, 2));
await client.end();
