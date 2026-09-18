import pg from "pg";
import type { DataRow, Judgment } from "../src/types.js";

let pool: pg.Pool | undefined;
export function postgresEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
export async function searchPostgres(
  rows: DataRow[],
  query: string,
): Promise<{ results: Judgment[]; cached: number }> {
  pool ??= new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT set_config('jev.api_key', $1, true), set_config('jev.model', $2, true), set_config('http.curlopt_timeout_ms', '20000', true), set_config('statement_timeout', '90000', true)",
      [
        process.env.OPENROUTER_API_KEY || "",
        process.env.OPENROUTER_MODEL || "~typesafe/jev-latest",
      ],
    );
    // This temporary relation belongs only to this database connection/transaction.
    await client.query(
      "CREATE TEMP TABLE IF NOT EXISTS jev_demo_candidates (position bigint, row_data jsonb, probability double precision, cached boolean) ON COMMIT DELETE ROWS",
    );
    await client.query(
      "INSERT INTO pg_temp.jev_demo_candidates SELECT ordinality, row_data, probability, cached FROM public.jev_evaluate($1::jsonb, $2) WITH ORDINALITY",
      [JSON.stringify(rows), query],
    );
    const count = await client.query<{ count: string }>(
      "SELECT count(*) FROM pg_temp.jev_demo_candidates WHERE cached",
    );
    // A real PostgreSQL predicate; jev_evaluate above warms all candidates in batches.
    const filtered = await client.query<{ row: DataRow; probability: number }>(
      "SELECT row_data AS row, probability FROM pg_temp.jev_demo_candidates WHERE public.jev(row_data, $1) ORDER BY position",
      [query],
    );
    await client.query("COMMIT");
    return { results: filtered.rows, cached: Number(count.rows[0].count) };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (
      error instanceof Error &&
      /function .*jev|relation .*jev/.test(error.message)
    )
      throw new Error(
        "Install the jev extension in the database configured by DATABASE_URL.",
      );
    throw new Error(
      "PostgreSQL Jev search failed. Check database connectivity, the installed extension, and OpenRouter access.",
    );
  } finally {
    client.release();
  }
}
