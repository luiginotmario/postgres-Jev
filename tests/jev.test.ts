import test from "node:test";
import assert from "node:assert/strict";
import { createJudge, parseProbability } from "../server/jev";

const response = (probability = 0.9) =>
  new Response(
    JSON.stringify({ answers: { row_0: { type: "noul", noul: probability } } }),
    { headers: { "Content-Type": "application/json" } },
  );

test("uses OpenRouter Decisions with Jev Latest and typed questions", async () => {
  const row = { id: 1, job: "Software engineer" };
  const judge = createJudge({
    apiKey: "test-key",
    fetcher: async (url, options) => {
      assert.equal(url, "https://openrouter.ai/api/alpha/decisions");
      assert.equal(options?.method, "POST");
      assert.equal(
        new Headers(options?.headers).get("Authorization"),
        "Bearer test-key",
      );
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model, "~typesafe/jev-latest");
      assert.deepEqual(body.state, {
        query: "could work from home",
      });
      assert.equal(body.questions.row_0.type, "noul");
      assert.ok(
        body.questions.row_0.instructions.endsWith(JSON.stringify(row)),
      );
      return response(0.95);
    },
  });
  const result = await judge.search([row], "could work from home");
  assert.equal(result[0].probability, 0.95);
});

test("model output must be a valid probability", () => {
  assert.equal(
    parseProbability({ answers: { match: { type: "noul", noul: 0 } } }),
    0,
  );
  for (const value of [-1, 2, NaN, "0.9", true, undefined]) {
    assert.throws(() =>
      parseProbability({ answers: { match: { type: "noul", noul: value } } }),
    );
  }
});

test("cache includes record contents and question", async () => {
  let calls = 0;
  const judge = createJudge({
    apiKey: "test",
    fetcher: async () => {
      calls++;
      return response();
    },
  });
  await judge.search([{ id: 1, name: "Alex" }], "remote");
  const cached = await judge.search([{ id: 1, name: "Alex" }], "remote");
  assert.equal(cached[0].cached, true);
  assert.equal(calls, 1);
  await judge.search([{ id: 1, name: "Maya" }], "remote");
  await judge.search([{ id: 1, name: "Maya" }], "designer");
  assert.equal(calls, 3);
});

test("native batches preserve row mapping even when answers arrive out of order", async () => {
  let calls = 0;
  const judge = createJudge({
    apiKey: "test",
    fetcher: async (_url, options) => {
      calls++;
      const body = JSON.parse(String(options?.body));
      const keys = Object.keys(body.questions).reverse();
      assert.ok(keys.length <= 128);
      return new Response(
        JSON.stringify({
          answers: Object.fromEntries(
            keys.map((key) => [
              key,
              { type: "noul", noul: Number(key.slice(4)) / 300 },
            ]),
          ),
        }),
      );
    },
  });
  const rows = Array.from({ length: 300 }, (_, id) => ({ id }));
  const results = await judge.search(rows, "query");
  assert.equal(calls, 3);
  assert.ok(
    results.every(
      (result) => result.probability === Number(result.row.id) / 300,
    ),
  );
  const cached = await judge.search(rows, "query");
  assert.ok(cached.every((result) => result.cached));
  assert.equal(calls, 3);
});

test("one missing batch answer rejects the search and does not cache partial results", async () => {
  let calls = 0;
  const judge = createJudge({
    apiKey: "test",
    fetcher: async () => {
      calls++;
      return response();
    },
  });
  await assert.rejects(() => judge.search([{ id: 1 }, { id: 2 }], "q"));
  await judge.search([{ id: 1 }], "q");
  assert.equal(calls, 2);
});

test("rate limits retry, authentication errors fail immediately", async () => {
  let calls = 0;
  const waits: number[] = [];
  const judge = createJudge({
    apiKey: "test",
    sleep: async (ms) => {
      waits.push(ms);
    },
    fetcher: async () =>
      ++calls < 3 ? new Response("", { status: 429 }) : response(),
  });
  await judge.search([{ id: 1 }], "q");
  assert.deepEqual(waits, [400, 800]);
  const invalid = createJudge({
    apiKey: "bad",
    fetcher: async () => new Response("", { status: 401 }),
  });
  await assert.rejects(() => invalid.search([{ id: 1 }], "q"), /401/);
});

test("invalid responses do not enter the cache", async () => {
  let calls = 0;
  const judge = createJudge({
    apiKey: "test",
    fetcher: async () => response(++calls === 1 ? 4 : 0.8),
  });
  await assert.rejects(() => judge.search([{ id: 1 }], "q"));
  assert.equal((await judge.search([{ id: 1 }], "q"))[0].probability, 0.8);
  assert.equal(calls, 2);
});
