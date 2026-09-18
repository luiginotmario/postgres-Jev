import assert from "node:assert/strict";
import { createServer } from "node:http";
import pg from "pg";

if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    "Set TEST_DATABASE_URL to an isolated PostgreSQL database with http and jev installed.",
  );
const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
let requests = 0;
let questions = 0;
let mode = "ok";
const mock = createServer(async (request, response) => {
  let text = "";
  for await (const chunk of request) text += chunk;
  const body = JSON.parse(text);
  requests++;
  assert.equal(request.headers.authorization, "Bearer test-key");
  assert.equal(body.model, "~typesafe/jev-latest");
  if (mode === "retry") {
    mode = "ok";
    response.writeHead(429).end();
    return;
  }
  if (mode === "denied") {
    response.writeHead(401).end("secret-upstream-body");
    return;
  }
  const entries = Object.entries(body.questions) as [
    string,
    { type: string; instructions: string },
  ][];
  questions += entries.length;
  const answers = Object.fromEntries(
    entries.reverse().map(([key, question]) => {
      assert.equal(question.type, "noul");
      const row = JSON.parse(question.instructions.split("\nRecord: ")[1]);
      return [
        key,
        {
          type: "noul",
          noul: mode === "invalid" ? 5 : row.match ? 0.95 : 0.05,
        },
      ];
    }),
  );
  if (mode === "missing") delete answers[Object.keys(answers)[0]];
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify({ answers }));
});
await new Promise<void>((resolve) => mock.listen(0, "127.0.0.1", resolve));
const address = mock.address();
if (!address || typeof address === "string") throw new Error("No mock address");
await db.connect();
let passed = 0;
async function check(name: string, run: () => Promise<void>) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}
try {
  await db.query(
    "SELECT set_config('jev.api_key', 'test-key', false), set_config('jev.api_url', $1, false)",
    [`http://127.0.0.1:${address.port}`],
  );
  const rows = Array.from({ length: 130 }, (_, id) => ({
    id,
    match: id % 2 === 0,
  }));
  await check("real extension installation", async () => {
    const r = await db.query(
      "SELECT extname FROM pg_extension WHERE extname IN ('http','jev')",
    );
    assert.equal(r.rowCount, 2);
  });
  await check(
    "native batching, correct row mapping and duplicate preservation",
    async () => {
      const result = await db.query("SELECT * FROM jev_evaluate($1, 'match')", [
        JSON.stringify([...rows, rows[0]]),
      ]);
      assert.equal(requests, 2);
      assert.equal(questions, 130);
      assert.equal(result.rowCount, 131);
      result.rows.forEach((row, i) => {
        assert.equal(row.row_data.id, i === 130 ? 0 : i);
        assert.equal(row.probability, row.row_data.match ? 0.95 : 0.05);
        assert.equal(row.cached, false);
      });
    },
  );
  await check("cache eliminates repeat HTTP requests", async () => {
    const result = await db.query("SELECT * FROM jev_evaluate($1, 'match')", [
      JSON.stringify(rows),
    ]);
    assert.ok(result.rows.every((row) => row.cached));
    assert.equal(requests, 2);
  });
  await check(
    "real WHERE jev on composite table rows after candidate preparation",
    async () => {
      await db.query("CREATE TEMP TABLE people (id integer, match boolean)");
      await db.query(
        "INSERT INTO people SELECT * FROM jsonb_to_recordset($1) AS p(id integer, match boolean)",
        [JSON.stringify(rows)],
      );
      await db.query(
        "SELECT jev_prepare(jsonb_agg(to_jsonb(p)), 'match') FROM people p",
      );
      const r = await db.query(
        "SELECT id FROM people p WHERE jev(p, 'match') ORDER BY id",
      );
      assert.equal(r.rowCount, 65);
      assert.ok(r.rows.every((row) => row.id % 2 === 0));
      assert.equal(requests, 2);
    },
  );
  await check("SQL candidate filtering sends only selected rows", async () => {
    const count = questions;
    await db.query(
      "SELECT jev_prepare(jsonb_agg(to_jsonb(p)), 'filtered') FROM (SELECT * FROM people WHERE id < 3) p",
    );
    assert.equal(questions - count, 3);
  });
  await check(
    "changed row contents and questions invalidate cache",
    async () => {
      const before = requests;
      const r = await db.query("SELECT jev_prob($1::jsonb, 'match') AS p", [
        JSON.stringify({ id: 0, match: false }),
      ]);
      assert.equal(r.rows[0].p, 0.05);
      assert.equal(requests, before + 1);
      await db.query("SELECT jev_prob($1::jsonb, 'new question')", [
        JSON.stringify(rows[0]),
      ]);
      assert.equal(requests, before + 2);
    },
  );
  await check("bad inputs rejected before HTTP", async () => {
    const before = requests;
    for (const [value, q] of [
      [{}, "q"],
      [[1], "q"],
      [rows, ""],
    ])
      await assert.rejects(
        db.query("SELECT * FROM jev_evaluate($1,$2)", [
          JSON.stringify(value),
          q,
        ]),
      );
    await assert.rejects(
      db.query("SELECT jev($1::jsonb, 'match', 2)", [JSON.stringify(rows[0])]),
    );
    await db.query("SET jev.max_rows = '2'");
    await assert.rejects(
      db.query("SELECT * FROM jev_evaluate($1, 'q')", [JSON.stringify(rows)]),
    );
    await db.query("RESET jev.max_rows");
    assert.equal(requests, before);
  });
  await check(
    "missing and invalid answers fail without partial cached results",
    async () => {
      for (const failure of ["invalid", "missing"]) {
        mode = failure;
        await assert.rejects(
          db.query("SELECT * FROM jev_evaluate($1,$2)", [
            JSON.stringify(rows.slice(0, 2)),
            failure,
          ]),
        );
        mode = "ok";
        const before = requests;
        const r = await db.query("SELECT * FROM jev_evaluate($1,$2)", [
          JSON.stringify(rows.slice(0, 2)),
          failure,
        ]);
        assert.ok(r.rows.every((row) => !row.cached));
        assert.equal(requests, before + 1);
      }
    },
  );
  await check(
    "rate limit retry and redacted authentication error",
    async () => {
      mode = "retry";
      let before = requests;
      await db.query("SELECT jev_prob($1::jsonb,'retry')", [
        JSON.stringify(rows[0]),
      ]);
      assert.equal(requests, before + 2);
      mode = "denied";
      before = requests;
      await assert.rejects(
        db.query("SELECT jev_prob($1::jsonb,'denied')", [
          JSON.stringify(rows[0]),
        ]),
        (error) =>
          error instanceof Error &&
          error.message.includes("401") &&
          !error.message.includes("secret-upstream-body"),
      );
      assert.equal(requests, before + 1);
      mode = "ok";
    },
  );
  await check("cache clear forces reevaluation", async () => {
    await db.query("SELECT jev_cache_clear()");
    const before = requests;
    await db.query("SELECT jev_prob($1::jsonb,'match')", [
      JSON.stringify(rows[0]),
    ]);
    assert.equal(requests, before + 1);
  });
  console.log(`${passed} PostgreSQL integration checks passed.`);
} finally {
  await db.end();
  await new Promise<void>((resolve, reject) =>
    mock.close((error) => (error ? reject(error) : resolve())),
  );
}
