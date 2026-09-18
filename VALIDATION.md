# Validation

- Strict TypeScript compilation passes.
- Tailwind/Vite production build passes.
- 15 TypeScript tests pass.
- Browser verified: minimal page, search results, and generation controls.
- Application source contains no `.js`, `.jsx`, `.java`, `.py`, or `.html` files. Browser bundles under `dist/` and the compiled `server/document.js` renderer are ignored build artifacts.

OpenRouter Decisions request routing, authorization, Jev Latest model selection, and typed probability parsing are covered by a mocked adapter test. Live Jev Latest inference through OpenRouter passed on two synthetic records: remote software engineer 0.97, on-site waiter 0.02. Repeating the query returned both records from cache.

- Signed dataset tests verify restoration across server instances, tamper rejection, and expiry.

- Local live search verified on 118 people: 72 remote-work matches.
- Browser verified: Live status, visible `jev(people, "Could work from home")` query, and `Jev Latest · noul` label.

- Vercel production verified: page, static JavaScript, dataset loading and generation return 200. Live OpenRouter search evaluated 81 sensor rows in 2540.2 ms and returned 57 matches.

- Performance investigation: the old 80-row search made 80 requests in 3525 ms. Native batching benchmark took 226 ms in one request; the implemented adapter took 776 ms on its live validation run and 0.36 ms from cache. Network timing varies.
- Batched tests cover row-to-answer mapping, batch bounds, missing answers, and atomic cache validation.

- Production after native batching: 125 people evaluated in 441.2 ms server time / 769 ms end-to-end. Repeating the query cached all 125 rows: 1.5 ms server time / 231 ms end-to-end. These are measured samples, not latency guarantees.
