import test from "node:test";
import assert from "node:assert/strict";
import { createJudge, parseProbability } from "../server/jev";

const response = (probability = 0.9) =>
  new Response(
    JSON.stringify({ answers: { match: { type: "noul", noul: probability } } }),
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
        record: row,
        query: "could work from home",
      });
      assert.equal(body.questions.match.type, "noul");
      assert.equal(typeof body.questions.match.instructions, "string");
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

test("concurrency is bounded and rows retain their probabilities", async () => {
  let active = 0;
  let peak = 0;
  const judge = createJudge({
    apiKey: "test",
    fetcher: async (_url, options) => {
      active++;
      peak = Math.max(peak, active);
      const body = JSON.parse(String(options?.body)) as {
        state: { record: { id: number } };
      };
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      return response(body.state.record.id / 20);
    },
  });
  const results = await judge.search(
    Array.from({ length: 20 }, (_, id) => ({ id })),
    "query",
  );
  assert.equal(peak, 8);
  assert.ok(
    results.every((result) => result.probability === result.row.id / 20),
  );
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
