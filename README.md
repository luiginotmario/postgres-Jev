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

`Generate random database` switches between fictional people, curated country samples, and synthetic sensor measurements. Generation runs directly in TypeScript. Datasets stay in local session memory for one hour.

## Search

Set `TYPESAFE_API_KEY` in `.env` and restart for arbitrary natural-language queries using Jev. Keys stay server-side. Requests evaluate rows independently with eight concurrent workers, retry rate limits twice, and cache successful probabilities by record contents, question, model, and instructions. Results use a 70% cutoff.

Without a key, the UI displays `Demo`. Only offline example rules work. The input placeholder shows a supported question, and unsupported questions explain the limitation. These scores are not model predictions.

Examples:

| Dataset | Query |
| --- | --- |
| People | Could work from home |
| People | People who know SQL |
| Countries | Landlocked countries |
| Countries | Places where people speak Spanish |
| Sensor readings | Low battery and high temperature |
| Sensor readings | Offline sensors |

This is a local prototype bound to loopback. There are no external database connection controls or endpoints.

## Validate

```sh
npm test
npm run build
npm start
```

The build includes strict TypeScript checks. Tests cover generated schemas, dataset switching, numeric predicates, output validation, caching, request concurrency, and retry behavior. Live inference requires a configured key.
