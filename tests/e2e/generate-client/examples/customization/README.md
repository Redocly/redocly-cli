# customization

Demonstrates customizing requests and responses **without editing the generated client** — every
mechanism composes from the hand-written `src/main.ts`, so it survives regeneration
(see [ADR-0014](../../docs/adr/0014-request-response-customization.md)):

1. **Custom transport** — `configure({ fetch })` (here a canned fetch, so the demo runs offline).
2. **Operation-targeted middleware** — `use({ onRequest })` matching on `ctx.operation.id` / `ctx.operation.tags`.
3. **Request-body mutation** — `onRequest` edits `ctx.body`, and the mutated body is sent.
4. **Raw-Response handling** — `onResponse` observes or replaces the `Response`.
5. **Per-call headers** — the trailing `RequestOptions` argument.

The generated client under `src/api/` is gitignored; CI regenerates it and type-checks this example.

## Run

```bash
npm install
npm run generate   # generate src/api (the client is gitignored)
npm run dev
```
