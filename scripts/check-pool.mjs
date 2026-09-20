// Validates the exact Pool usage from src/lib/db.ts against the Neon DB.
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(2);
}

const pool = new Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 6000 });
try {
  const result = await pool.query(
    "SELECT name, birthdate, welcome, hero_image FROM child WHERE id = 1 LIMIT 1",
  );
  const memories = await pool.query(
    "SELECT id, title, date, category, image FROM memories ORDER BY sort_order ASC",
  );
  console.log("child:", JSON.stringify(result.rows[0]));
  console.log("memories:", memories.rows.length, "rows, first image:", memories.rows[0].image);
  const rel = await pool.query('SELECT id, name, "group" FROM relatives ORDER BY sort_order ASC');
  console.log("relatives:", rel.rows.length, "rows");
} finally {
  await pool.end();
}
process.exit(0);
