import { randomUUID } from "node:crypto";
import type { Dataset, DataRow } from "../src/types.js";

export interface SupabaseConnection {
  url: string;
  apiKey: string;
}
export function connectionInput(
  input: Record<string, unknown>,
): SupabaseConnection {
  let url: URL;
  try {
    url = new URL(String(input.url));
  } catch {
    throw new Error("Enter your Supabase project URL.");
  }
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Use https://your-project.supabase.co as the project URL.");
  const apiKey = String(input.apiKey || "").trim();
  if (!apiKey || apiKey.length > 8192 || /[\r\n]/.test(apiKey))
    throw new Error("Enter a valid Supabase API key.");
  return { url: url.origin, apiKey };
}

export async function readSupabase(
  connection: SupabaseConnection,
  fetcher: typeof fetch = fetch,
): Promise<Dataset> {
  const headers: Record<string, string> = {
    apikey: connection.apiKey,
    "Accept-Profile": "public",
  };
  if (connection.apiKey.startsWith("eyJ"))
    headers.Authorization = `Bearer ${connection.apiKey}`;
  async function request(url: URL, accept: string) {
    const response = await fetcher(url, {
      method: "GET",
      headers: { ...headers, Accept: accept },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error(
        `Supabase read failed (${response.status}). The key needs access to the Data API schema and SELECT permissions on its tables.`,
      );
    return response.json();
  }
  const metadata = await request(
    new URL("/rest/v1/", connection.url),
    "application/openapi+json",
  );
  if (!metadata.paths || typeof metadata.paths !== "object")
    throw new Error(
      "Supabase did not expose its table list to this key. Check Data API schema access.",
    );
  // PostgREST only exposes relations visible to this role; RPC endpoints are excluded.
  const tables = Object.keys(metadata.paths)
    .filter((path) => /^\/[^/]+$/.test(path) && metadata.paths[path]?.get)
    .map((path) => path.slice(1))
    .sort();
  if (!tables.length)
    throw new Error(
      "No readable tables were exposed by this key in the public Data API schema.",
    );
  if (tables.length > 100)
    throw new Error(
      "This project exposes more than 100 tables; the demo supports up to 100 tables per search.",
    );
  const limit = 500;
  const perTable = Math.max(1, Math.floor(limit / tables.length));
  const groups: DataRow[][] = new Array(tables.length);
  let capped = false;
  let next = 0;
  let totalBytes = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, tables.length) }, async () => {
      while (next < tables.length) {
        const index = next++;
        const table = tables[index];
        const url = new URL(
          `/rest/v1/${encodeURIComponent(table)}`,
          connection.url,
        );
        url.searchParams.set("select", "*");
        url.searchParams.set("limit", String(perTable + 1));
        const raw: unknown = await request(url, "application/json");
        if (
          !Array.isArray(raw) ||
          raw.some(
            (row) => !row || typeof row !== "object" || Array.isArray(row),
          )
        )
          throw new Error("Supabase returned unexpected table data.");
        if (raw.length > perTable) capped = true;
        groups[index] = raw.slice(0, perTable).map((row, i) => {
          const record = JSON.stringify(row);
          totalBytes += Buffer.byteLength(record);
          if (totalBytes > 500000)
            throw new Error(
              "The returned records exceed the demo's 500 KB limit.",
            );
          return { id: `${table}:${i}`, table, record };
        });
      }
    }),
  );
  return {
    kind: "people",
    title: "Supabase",
    live: true,
    version: randomUUID(),
    rows: groups.flat(),
    columns: [
      { key: "table", label: "Table" },
      { key: "record", label: "Record" },
    ],
    examples: ["Describe the records you want to find"],
    source: {
      type: "supabase",
      tables,
      limit: perTable * tables.length,
      capped,
    },
  };
}
