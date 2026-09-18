# postgres-Jev

**Your database. In your own words.**

A local search workbench and experimental PostgreSQL extension powered by [TypeSafe Jev](https://docs.typesafe.ai/api). No vector index or embedding pipeline. Jev evaluates each selected record against a natural-language predicate and returns a probability.

```sql
SELECT * FROM people
WHERE jev(people, 'could work from home');
```

## Try it

Requires Node.js 22.14 or newer and Java 11 or newer.

```sh
npm install
cp .env.example .env
npm run dev
# http://localhost:4317
```

The interface is deliberately small: **a search box, a table, and Generate random database**. No sidebar, database connections, or setup screens.

The Java generator switches to a different dataset on every click:

- **People:** 80–129 fictional people with randomized names, occupations, locations, and experience.
- **Countries:** a randomly shuffled 18–30 country sample with curated geographic descriptions. Geographic facts are not invented by a model.
- **Sensor readings:** 50–100 random numerical records: temperature, humidity, battery, and operational status.

The initial table contains 129 seeded people. Generated datasets live in the local server's session memory for one hour. They are playground records, not persisted PostgreSQL tables. Each dataset comes with example questions. Pagination and clear-search controls keep the table usable.

### Live search

Add `TYPESAFE_API_KEY` to `.env`, then restart. Jev supports arbitrary questions through `POST https://api.typesafe.ai/v1/systemone`, model `jev-latest`, with a `noul` question for each record. Rows scoring at least 0.7 appear in descending probability order.

Without a key, **only the displayed example questions work**, using explicitly labeled deterministic demo rules. These are not Jev predictions. Unknown queries return a clear error rather than pretending to understand. No external model calls are made in offline mode.

The live adapter runs at most eight concurrent requests, retries rate limits twice with backoff, and uses a 20-second request timeout. Judgments are cached for an hour by record, query, instructions, and model. Changing or regenerating the dataset clears its cache. The UI reports measured server time and actual cache hits, not benchmark claims.

This is a **single-user local prototype**, bound to loopback. Production hosting requires authentication or public-demo quotas, API spend limits, and a deployment-specific origin policy. The app exposes no database connection endpoint. API keys stay on the server.

## PostgreSQL extension

The extension needs self-hosted PostgreSQL 17 with `plpython3u` and outbound HTTPS access. It cannot be installed into ordinary hosted Supabase instances. It is experimental; the web workbench is independently usable.

```sh
docker compose up -d --build
# Set DATABASE_URL=postgres://jev:local-development-only@localhost:54329/jev_playground
npm run seed
```

The development container installs `plpython3u` and `jev` at initialization. Pass `TYPESAFE_API_KEY` via your shell or `.env`. The optional seed command uses `DATABASE_URL` to connect to the development container and creates `public.people`; it refuses to overwrite an existing table.

For an existing self-hosted server, install PL/Python and then `make -C extension install` as an administrator. Run `CREATE EXTENSION jev CASCADE;`. Functions live in `public`. Grant all three functions only to trusted roles allowed to issue billable outbound requests:

```sql
GRANT EXECUTE ON FUNCTION public.jev(anyelement, text, double precision) TO your_role;
GRANT EXECUTE ON FUNCTION public.jev_probability(jsonb, text) TO your_role;
GRANT EXECUTE ON FUNCTION public.jev_evaluate(jsonb, text) TO your_role;

SELECT * FROM public.people
WHERE jev(people, 'knows SQL and lives in the United States', 0.8);
```

The shorthand predicate evaluates rows sequentially as PostgreSQL calls it. For concurrency, prefilter and batch explicitly:

```sql
WITH candidates AS MATERIALIZED (
  SELECT * FROM public.people WHERE country = 'United States' LIMIT 500
), judged AS MATERIALIZED (
  SELECT public.jev_evaluate(
    COALESCE(jsonb_agg(to_jsonb(candidates)), '[]'::jsonb),
    'could work from home'
  ) AS results FROM candidates
)
SELECT result->'record' AS record,
       (result->>'probability')::double precision AS probability
FROM judged, LATERAL jsonb_array_elements(results) AS result
WHERE (result->>'probability')::double precision >= 0.7;
```

`jev_evaluate` runs eight workers; workers never call PostgreSQL SPI. Its bounded one-hour cache lives in the database backend process and includes role, key, record, query, instructions, and model. Transaction pooling may land subsequent calls on a different cache. Failed calls raise an error rather than silently treating rows as nonmatches. External API charges cannot roll back with a database transaction. These volatile functions are not suitable for indexes, generated columns, or constraints.

There is no claim that all databases or all queries run in one second. First-pass cost and latency scale with candidate count and API limits; warm-cache behavior is different. Pin a model version rather than an alias when reproducibility matters.

## Development

```sh
npm test
npm run build
npm start
python3 -m unittest discover -s tests -p 'test_*.py'
```

Unit tests use mocked TypeSafe responses and also execute the Java generator; live integration requires an API key. `extension/` includes a Docker recipe for actual PostgreSQL testing. See `VALIDATION.md` for what was and was not exercised in this checkout.

The frontend follows the requested design-engineering approach: restrained motion, immediate press feedback, keyboard search focus and reduced-motion support.
