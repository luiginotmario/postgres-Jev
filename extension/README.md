# PostgreSQL Jev extension

Real SQL predicates backed by `~typesafe/jev-latest` through OpenRouter. Implemented in SQL/PL/pgSQL with the PostgreSQL `http` extension; no Python runtime or application server is required.

## Install

Install PostgreSQL's `http` extension package first (for example `postgresql-17-http` on Debian with the PostgreSQL package repository). Then:

```sh
cd extension
make install PG_CONFIG=/path/to/pg_config
psql "$DATABASE_URL" -c 'CREATE EXTENSION http; CREATE EXTENSION jev;'
```

Installing extension files requires access to the PostgreSQL server filesystem. Enable extensions as a database administrator. Tested on PostgreSQL 17.11 with pgsql-http 1.7.0.

Docker is an optional alternative for development:

```sh
docker build -t postgres-jev ./extension
docker run --rm -p 127.0.0.1:5432:5432 -e POSTGRES_PASSWORD postgres-jev
```

On managed hosts where custom extension packages cannot be installed, an administrator can enable `http` and execute `sql/jev--0.1.0.sql` as a SQL migration. This installs the functions, not a registered `jev` extension. Availability and privileges depend on the host; a Supabase REST API key cannot perform this installation. Our local tests do not establish compatibility with every managed host.

## Query

Provide the key through a parameterized `set_config` call in your database client. The example below uses a placeholder; do not commit real credentials:

```sql
BEGIN;
SET LOCAL jev.api_key = 'YOUR_OPENROUTER_KEY';
SET LOCAL http.curlopt_timeout_ms = '20000';

SELECT name FROM people p
WHERE jev(p, 'can work entirely from home');
COMMIT;
```

A scalar predicate evaluates uncached rows individually. For fast multirow queries, explicitly prepare only the candidate rows you intend to send:

```sql
BEGIN;
SET LOCAL jev.api_key = 'YOUR_OPENROUTER_KEY';

CREATE TEMP TABLE candidates ON COMMIT DROP AS
SELECT id, name, description
FROM people
WHERE country = 'United States'
LIMIT 500;

-- Native parallel questions: up to 128 rows in each HTTP request.
SELECT jev_prepare(coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb),
                   'could explain a technical product to a beginner')
FROM candidates c;

-- The same row contents + question reuse the prepared judgments.
SELECT c.*, jev_prob(c, 'could explain a technical product to a beginner') AS probability
FROM candidates c
WHERE jev(c, 'could explain a technical product to a beginner');
COMMIT;
```

The extension never reads an entire table behind a predicate. Filtering candidates first avoids sending unrelated rows. Keep preparation and querying on the same database connection. Use a transaction when connecting through a transaction pooler.

## API

| Function                               | Result                                             |
| -------------------------------------- | -------------------------------------------------- |
| `jev(row, question, threshold := 0.7)` | Boolean predicate                                  |
| `jev_prob(row, question)`              | Match probability, 0–1                             |
| `jev_evaluate(rows_jsonb, question)`   | All input rows with probability and cache-hit flag |
| `jev_prepare(rows_jsonb, question)`    | Warms the cache in batches; returns row count      |
| `jev_cache_clear()`                    | Clears this connection's cache                     |

`jev_evaluate` preserves input ordering and duplicates, but deduplicates equal uncached records before calling the model. Multiple batches execute sequentially; questions within each batch are evaluated in parallel by Jev. Do not confuse this with parallel HTTP requests.

Settings: `jev.api_key`, `jev.model` (default `~typesafe/jev-latest`), `jev.batch_size` (1–128, default 128), `jev.max_rows` (1–5000, default 1000). `jev.api_url` is available for explicit test/proxy configuration. The timeout is controlled by pgsql-http's `http.curlopt_timeout_ms`.

The cache lasts up to one hour on the PostgreSQL connection and is bounded to 10,000 entries. Keys include role, row contents, query, model, endpoint, and instruction. Changed rows are reevaluated. No embeddings or semantic index is built. Functions run with caller privileges. Row contents leave the database for OpenRouter/TypeSafe; only select columns appropriate to send. Failed transactions roll back cache writes but cannot reverse already completed API calls.

## Tests

Use an isolated database with both extensions installed:

```sh
TEST_DATABASE_URL=postgresql://... npm run test:extension
```

The TypeScript test runner starts a local mock HTTP endpoint and exercises the installed PostgreSQL functions, real composite-row predicates, batching, cache behavior, invalid inputs, missing answers, rate limiting, and authentication failures. It does not use your OpenRouter key. Separate live validation is documented in `VALIDATION.md`.
