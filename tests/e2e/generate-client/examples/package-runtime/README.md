# package-runtime example

Generated TypeScript client using **`runtime: package`**: the generated `src/api/client.ts`
contains only this API's types and operation descriptors and imports the engine
(`createClient`, `ApiError`, middleware, auth) from `@redocly/client-generator` — the example's
one real dependency. Engine fixes arrive via `npm update @redocly/client-generator` with no
regeneration; regenerate only when the API contract changes.

## Run

```bash
npm install
npm run generate   # regenerate src/api from openapi.yaml (optional; client is checked in)
npm run dev        # open the printed local URL
```

The generated client under `src/api/` is committed and drift-checked against the generator in CI.
The app code is the same as the inline examples — `configure()`, `use()` middleware, free
functions, the `client` instance, `ApiError` — only the runtime's distribution differs.
