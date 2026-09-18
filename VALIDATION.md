# Validation

## Application

- 19 TypeScript tests pass; strict compilation and the Vite/Tailwind production build pass.
- Supabase adapter tests cover project-host validation, discovery of multiple tables, RPC exclusion, read-only requests, complete JSON records, bounded sampling, and redacted errors.
- No actual Supabase project credentials were supplied: live Supabase discovery has not been tested.
- The UI offers only project URL and API key. Rows are searched across the public Data API tables visible to that key; the subset is capped and labeled.
- Removed the `API demo · Jev Latest · noul` label.

## PostgreSQL extension

Tested against an isolated native PostgreSQL 17.11 instance with pgsql-http 1.7.0 on September 18, 2026. Docker was unavailable; its image recipe was not exercised.

All 10 integration checks pass:

1. Actual `CREATE EXTENSION http` and `CREATE EXTENSION jev` installation.
2. 130 unique rows in two HTTP batches; 131 outputs preserve ordering and duplicates.
3. Repeated queries send no additional HTTP requests.
4. Real composite-row `WHERE jev(...)` filtering after batch preparation.
5. SQL candidate filtering sends only selected rows.
6. Changed row contents or questions invalidate cached judgments.
7. Invalid inputs and row limits fail before HTTP calls.
8. Missing or invalid probabilities do not create partial cache entries.
9. Rate-limit retry and redacted authentication errors.
10. Cache clearing forces reevaluation.

Live OpenRouter test executed from PostgreSQL: `WHERE jev(p, 'can work entirely from home')` selected the remote software worker (0.90) and excluded the on-site surgeon (0.01). Preparation plus predicate took 699 ms; repeating the batch took 1 ms and both rows were cached.

The local dashboard is configured with the isolated test database. End-to-end server route: 114 seeded people evaluated by PostgreSQL in 860.7 ms, 53 matches; repeat returned the same matches with 114 cache hits in 18 ms.

These are measured samples, not latency guarantees. The PostgreSQL implementation evaluates native questions in batches, but HTTP batches run sequentially. Scalar `jev()` calls on an unprepared candidate set make per-row requests. Use `jev_prepare` or `jev_evaluate` for multirow workloads.

## Hosted demo

Vercel has the OpenRouter key but no PostgreSQL connection configured. It retains the TypeScript model adapter. Earlier production verification: 125 rows in 441.2 ms server time / 769 ms end-to-end, cached repeat 1.5 ms server time / 231 ms end-to-end. This is distinct from the tested PostgreSQL execution path.

All `.env` files, local database credentials, and Vercel local configuration remain ignored. The PostgreSQL test database lives outside the repository in a private temporary directory and listens only on loopback port 55439.
