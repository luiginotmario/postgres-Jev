import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Manifest } from "vite";
import { datasetTokens } from "./dataset-token.js";
import { generateDataset, nextDataset, scoreDemo } from "./datasets.js";
import { renderDocument } from "./document.js";
import {
  connectionInput,
  readSupabase,
  type SupabaseConnection,
} from "./supabase.js";
import { postgresEnabled, searchPostgres } from "./postgres-jev.js";
import { createJudge } from "./jev.js";
import type { Dataset, Judgment } from "../src/types.js";

const root = process.env.VERCEL
  ? process.cwd()
  : path.dirname(path.dirname(fileURLToPath(import.meta.url)));
if (existsSync(path.join(root, ".env")))
  process.loadEnvFile(path.join(root, ".env"));
const port = Number(process.env.PORT || 4317);
const live = Boolean(process.env.OPENROUTER_API_KEY);
const publicUrl = process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL;
const allowedOrigins = [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
  ...(publicUrl ? [new URL(publicUrl).origin] : []),
  ...[process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
    .filter(Boolean)
    .map((host) => `https://${host}`),
];
const app = express();
const tokens = datasetTokens(
  process.env.OPENROUTER_API_KEY || randomBytes(32).toString("hex"),
);

const localConnections =
  !process.env.VERCEL && !process.env.RENDER && !publicUrl;

interface Session {
  connection?: SupabaseConnection;
  expires: number;
  busy: boolean;
  dataset: Dataset;
  judge: ReturnType<typeof createJudge>;
}

const sessions = new Map<string, Session>();
const sessionLifetime = 3600000;
app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));
app.use("/api", (request, response, next) => {
  response.set("Cache-Control", "no-store");
  if (
    request.method !== "GET" &&
    request.headers.origin &&
    !allowedOrigins.includes(request.headers.origin)
  ) {
    response
      .status(403)
      .json({ error: "Cross-origin requests are not allowed." });
    return;
  }
  next();
});

function getSession(request: Request, response: Response): Session {
  const token = request.headers.cookie?.match(
    /(?:^|; )jev_session=([a-f0-9]{48})(?:;|$)/,
  )?.[1];
  const supplied = request.body?.datasetToken;
  const restored = supplied ? tokens.decode(supplied) : undefined;
  const existing = token ? sessions.get(token) : undefined;
  if (
    existing &&
    existing.expires > Date.now() &&
    (!restored || restored.version === existing.dataset.version)
  ) {
    existing.expires = Date.now() + sessionLifetime;
    return existing;
  }
  for (const [key, value] of sessions)
    if (value.expires < Date.now()) sessions.delete(key);
  if (sessions.size >= 50)
    throw new Error("Too many active sessions. Try again later.");
  const id = randomBytes(24).toString("hex");
  const session: Session = {
    expires: Date.now() + sessionLifetime,
    busy: false,
    dataset: restored ? { ...restored, live } : generateDataset("people", live),
    judge: createJudge({
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || "~typesafe/jev-latest",
    }),
  };
  sessions.set(id, session);
  response.cookie("jev_session", id, {
    httpOnly: true,
    secure:
      Boolean(process.env.VERCEL) ||
      (publicUrl?.startsWith("https://") ?? false),
    sameSite: "strict",
    maxAge: sessionLifetime,
  });
  return session;
}

function publicDataset(dataset: Dataset): Dataset {
  return {
    ...dataset,
    localConnections,
    engine: postgresEnabled() ? "postgres" : "application",
    token: dataset.source ? undefined : tokens.encode(dataset),
  };
}

app.post("/api/supabase/connect", async (request, response) => {
  if (
    !localConnections ||
    !["localhost", "127.0.0.1", "[::1]"].includes(request.hostname)
  ) {
    response.status(403).json({
      error: "Run this app locally to connect your own Supabase project.",
    });
    return;
  }
  if (!live) {
    response.status(400).json({
      error:
        "Set OPENROUTER_API_KEY in your local .env and restart before connecting.",
    });
    return;
  }
  const session = getSession(request, response);
  if (session.busy) {
    response
      .status(429)
      .json({ error: "Let the current search finish first." });
    return;
  }
  session.busy = true;
  try {
    const connection = connectionInput(request.body);
    const dataset = await readSupabase(connection);
    session.connection = connection;
    session.dataset = dataset;
    session.judge.clear();
    response.json(publicDataset(dataset));
  } finally {
    session.busy = false;
  }
});

app.get("/api/dataset", (request, response) => {
  const dataset = getSession(request, response).dataset;
  response.json(publicDataset(dataset));
});

app.post("/api/generate", (request, response) => {
  const session = getSession(request, response);
  if (session.busy) {
    response
      .status(429)
      .json({ error: "Let the current search finish first." });
    return;
  }
  session.connection = undefined;
  session.dataset = nextDataset(session.dataset.kind, live);
  session.judge.clear();
  response.json(publicDataset(session.dataset));
});

app.post("/api/search", async (request, response) => {
  const { query, version, source } = request.body as {
    query?: unknown;
    version?: unknown;
    source?: unknown;
  };
  if (typeof query !== "string" || !query.trim() || query.length > 500) {
    response
      .status(400)
      .json({ error: "Enter a question between 1 and 500 characters." });
    return;
  }
  const session = getSession(request, response);
  if (source === "supabase" && !session.connection) {
    response.status(409).json({
      error: "Your local connection expired. Connect to Supabase again.",
    });
    return;
  }
  if (version !== session.dataset.version) {
    response
      .status(409)
      .json({ error: "The dataset changed. Refresh and try again." });
    return;
  }
  if (session.busy) {
    response
      .status(429)
      .json({ error: "Let the current search finish first." });
    return;
  }
  session.busy = true;
  const start = performance.now();
  try {
    if (session.connection)
      session.dataset = {
        ...(await readSupabase(session.connection)),
        version: session.dataset.version,
      };
    let results: Judgment[];
    let cached = 0;
    if (live && postgresEnabled()) {
      const judged = await searchPostgres(session.dataset.rows, query.trim());
      results = judged.results;
      cached = judged.cached;
    } else if (live) {
      const judgments = await session.judge.search(
        session.dataset.rows,
        query.trim(),
      );
      results = judgments;
      cached = judgments.filter((row) => row.cached).length;
    } else {
      try {
        results = scoreDemo(session.dataset, query);
      } catch (error) {
        response.status(422).json({
          error:
            error instanceof Error ? error.message : "Unsupported demo query.",
        });
        return;
      }
    }
    response.json({
      dataset: session.connection ? publicDataset(session.dataset) : undefined,
      results: results.map(({ row, probability }) => ({ row, probability })),
      elapsed: Number((performance.now() - start).toFixed(1)),
      evaluated: session.dataset.rows.length,
      cached,
      mode: live ? "live" : "demo",
    });
  } finally {
    session.busy = false;
  }
});

const handleError: ErrorRequestHandler = (
  error: Error,
  _request,
  response,
  _next,
) => {
  response.status(502).json({ error: error.message || "Request failed." });
};
app.use("/api", handleError);
app.use("/api", (_request, response) => {
  response.status(404).json({ error: "Endpoint not found." });
});

if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
  const manifest = JSON.parse(
    readFileSync(path.join(root, "dist/.vite/manifest.json"), "utf8"),
  ) as Manifest;
  const entry = manifest["src/main.tsx"];
  app.use(express.static(path.join(root, "dist")));
  app.get("/", (_request, response) => {
    response.type("html").send(
      renderDocument({
        script: `/${entry.file}`,
        styles: entry.css?.map((file) => `/${file}`),
      }),
    );
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: "custom",
  });
  app.get("/", (_request, response) => {
    response
      .type("html")
      .send(renderDocument({ script: "/src/main.tsx", development: true }));
  });
  app.use(vite.middlewares);
}

export default app;

if (!process.env.VERCEL) {
  const server = app.listen(port, process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
  server.on("listening", () => console.log(`http://localhost:${port}`));
  server.on("error", (error) => {
    console.error(error.message);
    process.exit(1);
  });
}
