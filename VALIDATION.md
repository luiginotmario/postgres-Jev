# Validation

- `npm test`: 10 passing tests covering Jev response validation, cache keys, eviction/expiry, retries, concurrency limits, offline examples, and real execution of all three Java dataset generators.
- `python3 -m unittest discover -s tests -p 'test_*.py'`: 4 passing tests executing the PL/Python function body with mocked PostgreSQL SPI and HTTP responses.
- `npm run build`: production frontend builds successfully.
- Browser: verified seeded people, example search, random database generation, numeric filtering, clear/search controls, and pagination. The simplified UI has no sidebar or connection flow.

Not yet verified:

- Live TypeSafe calls: no API key was supplied for this project. The default demo is labeled and uses deterministic example rules.
- `CREATE EXTENSION` and Docker startup against an actual PostgreSQL server: no PostgreSQL or Docker runtime was available in this environment. The extension remains experimental; Python-body tests do not prove PostgreSQL installation compatibility.
- Production deployment, public authentication, or concurrent multi-user load. This is a local prototype.
