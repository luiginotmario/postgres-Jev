import express, {
  type ErrorRequestHandler,
  type Request,
  type Response,
} from "express";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer, type Manifest } from "vite";
import { generateDataset, nextDataset, scoreDemo } from "./datasets";
import { renderDocument } from "./document";
import { createJudge } from "./jev";
import type { Dataset, Judgment } from "../src/types";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
if (existsSync(path.join(root, ".env")))
  process.loadEnvFile(path.join(root, ".env"));
const port = Number(process.env.PORT || 4317);
const live = Boolean(process.env.TYPESAFE_API_KEY);
const app = express();

interface Session {
  expires: number;
  busy: boolean;
  dataset: Dataset;
  judge: ReturnType<typeof createJudge>;
}

const sessions = new Map<string, Session>();
const sessionLifetime = 3600000;
app.disable("x-powered-by");
app.use(express.json({ limit: "8kb" }));
app.use("/api", (request, response, next) => {
  response.set("Cache-Control", "no-store");
  const origins = [`http://localhost:${port}`, `http://127.0.0.1:${port}`];
  if (
    request.method !== "GET" &&
    request.headers.origin &&
    !origins.includes(request.headers.origin)
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
  const existing = token ? sessions.get(token) : undefined;
  if (existing && existing.expires > Date.now()) {
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
    dataset: generateDataset("people", live),
    judge: createJudge({
      apiKey: process.env.TYPESAFE_API_KEY,
      model: process.env.TYPESAFE_MODEL || "jev-latest",
    }),
  };
  sessions.set(id, session);
  response.cookie("jev_session", id, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: sessionLifetime,
  });
  return session;
}

app.get("/api/dataset", (request, response) => {
  response.json(getSession(request, response).dataset);
});

app.post("/api/generate", (request, response) => {
  const session = getSession(request, response);
  if (session.busy) {
    response
      .status(429)
      .json({ error: "Let the current search finish first." });
    return;
  }
  session.dataset = nextDataset(session.dataset.kind, live);
  session.judge.clear();
  response.json(session.dataset);
});

app.post("/api/search", async (request, response) => {
  const { query, version } = request.body as {
    query?: unknown;
    version?: unknown;
  };
  if (typeof query !== "string" || !query.trim() || query.length > 500) {
    response
      .status(400)
      .json({ error: "Enter a question between 1 and 500 characters." });
    return;
  }
  const session = getSession(request, response);
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
    let results: Judgment[];
    let cached = 0;
    if (live) {
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
        response
          .status(422)
          .json({
            error:
              error instanceof Error
                ? error.message
                : "Unsupported demo query.",
          });
        return;
      }
    }
    response.json({
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

if (process.env.NODE_ENV === "production") {
  const manifest = JSON.parse(
    readFileSync(path.join(root, "dist/.vite/manifest.json"), "utf8"),
  ) as Manifest;
  const entry = manifest["src/main.tsx"];
  app.use(express.static(path.join(root, "dist")));
  app.get("/", (_request, response) => {
    response
      .type("html")
      .send(
        renderDocument({
          script: `/${entry.file}`,
          styles: entry.css?.map((file) => `/${file}`),
        }),
      );
  });
} else {
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

const server = app.listen(port, "127.0.0.1");
server.on("listening", () => console.log(`http://localhost:${port}`));
server.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
