import pg from "pg";
const p = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await p.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
);
console.log(r.rows.map((x) => x.column_name).join(", "));
await p.end();
