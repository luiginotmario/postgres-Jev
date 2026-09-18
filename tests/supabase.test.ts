import test from "node:test";
import assert from "node:assert/strict";
import { connectionInput, readSupabase } from "../server/supabase";
const input = {
  url: "https://example.supabase.co",
  apiKey: "sb_publishable_test",
};
test("Supabase accepts only a hosted project URL and key", () => {
  for (const url of [
    "https://evil.com",
    "https://example.supabase.co.evil.com",
    "http://example.supabase.co",
    "https://example.supabase.co/auth",
  ])
    assert.throws(() => connectionInput({ ...input, url }));
  assert.deepEqual(connectionInput(input), input);
});
test("discovers every exposed table, excludes RPCs, and preserves complete records", async () => {
  const paths: string[] = [];
  const result = await readSupabase(
    connectionInput(input),
    async (url, options) => {
      const path = new URL(String(url)).pathname;
      paths.push(path);
      assert.equal(options?.method, "GET");
      assert.equal(options?.redirect, "error");
      assert.equal(new Headers(options?.headers).get("apikey"), input.apiKey);
      if (path === "/rest/v1/")
        return new Response(
          JSON.stringify({
            paths: {
              "/people": { get: {} },
              "/tickets": { get: {} },
              "/rpc/delete_all": { post: {} },
            },
          }),
        );
      return new Response(
        JSON.stringify([{ id: "uuid", details: { text: path } }]),
      );
    },
  );
  assert.deepEqual(result.source?.tables, ["people", "tickets"]);
  assert.equal(result.rows.length, 2);
  assert.ok(String(result.rows[0].record).includes('"id":"uuid"'));
  assert.ok(!JSON.stringify(result).includes(input.apiKey));
  assert.equal(paths.length, 3);
});
test("all tables receive a bounded share and truncation is explicit", async () => {
  const result = await readSupabase(connectionInput(input), async (url) => {
    const parsed = new URL(String(url));
    if (parsed.pathname === "/rest/v1/")
      return new Response(
        JSON.stringify({ paths: { "/a": { get: {} }, "/b": { get: {} } } }),
      );
    assert.equal(parsed.searchParams.get("limit"), "251");
    return new Response(
      JSON.stringify(Array.from({ length: 251 }, (_, id) => ({ id }))),
    );
  });
  assert.equal(result.rows.length, 500);
  assert.equal(result.source?.capped, true);
});
test("discovery and table errors fail clearly without echoing response secrets", async () => {
  await assert.rejects(
    () =>
      readSupabase(
        connectionInput(input),
        async () => new Response("private-secret", { status: 403 }),
      ),
    (e) =>
      e instanceof Error &&
      e.message.includes("403") &&
      !e.message.includes("private-secret"),
  );
  await assert.rejects(
    () =>
      readSupabase(
        connectionInput(input),
        async () => new Response(JSON.stringify({ paths: {} })),
      ),
    /No readable tables/,
  );
});
