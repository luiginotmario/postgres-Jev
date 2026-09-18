# Search playground

A search input, a results table, and a button to generate a different dataset.

## Stack

- React with TypeScript and Tailwind CSS 4
- TypeScript server, data generator, model adapter, and tests
- Vite builds typed React source; the document is rendered from TSX

No handwritten JavaScript, Java, Python, or standalone HTML source files. The earlier experimental database extension was removed in favor of the requested TypeScript-only application.

## Run

Node.js 20.14 or newer:

```sh
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:4317.

`Generate random database` switches between fictional people, curated country samples, and synthetic sensor measurements. Generation runs directly in TypeScript. Datasets are signed with a one-hour expiry and sent back with searches, so they survive serverless instance changes.

## Search

Set `OPENROUTER_API_KEY` in `.env` and restart for arbitrary natural-language queries using Jev Latest through OpenRouter (`~typesafe/jev-latest`). The adapter uses OpenRouter’s [native Decisions API](https://openrouter.ai/openapi.json), preserving Jev’s typed probability output. Set `OPENROUTER_MODEL` to pin a specific version if needed. Keys stay server-side. Rows are submitted as independent `noul` questions in native Jev batches (up to 128 questions and 96 KB of question text per call, with at most four calls in flight). Each question contains only its own record; the query is shared state. Requests retry rate limits twice and cache successful probabilities by record contents, question, model, and instructions. Caches are held in instance memory and can reset on Vercel cold starts or instance changes. Results use a 70% cutoff.

Without a key, the UI displays `Demo`. Only offline example rules work. The input placeholder shows a supported question, and unsupported questions explain the limitation. These scores are not model predictions.

Examples:

| Dataset         | Query                             |
| --------------- | --------------------------------- |
| People          | Could work from home              |
| People          | People who know SQL               |
| Countries       | Landlocked countries              |
| Countries       | Places where people speak Spanish |
| Sensor readings | Low battery and high temperature  |
| Sensor readings | Offline sensors                   |

Locally the server binds to loopback. On Render it binds to all interfaces and accepts same-origin requests from `RENDER_EXTERNAL_URL`. For a custom domain, set `APP_ORIGIN` to the public origin (overrides the Render URL). There are no external database connection controls or endpoints.

## Validate

```sh
npm test
npm run build
npm start
```

The build includes strict TypeScript checks. Tests cover generated schemas, dataset switching, numeric predicates, output validation, caching, request concurrency, and retry behavior. Live inference requires a configured key.

## Render

Use `npm ci && npm run build` as the build command and `npm start` as the start command. Set `OPENROUTER_API_KEY` in the service environment; keep it out of source control. `OPENROUTER_MODEL` defaults to `~typesafe/jev-latest`.

## Vercel

Deploy with `vercel --prod`. The `api/index.ts` function serves the Express API and TSX-rendered page; Vite assets are served statically. Set `OPENROUTER_API_KEY` as a sensitive production environment variable and `OPENROUTER_MODEL` to `~typesafe/jev-latest`. Deployment hostnames are allowed automatically; use `APP_ORIGIN` for a custom domain. `.vercelignore` excludes local environment files from uploads.
