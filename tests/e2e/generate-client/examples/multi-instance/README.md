# multi-instance example

Per-tenant client instances from one generated module: `createClient` (from
`@redocly/client-generator`) plus the generated `OPERATIONS` descriptors and
`Ops`/`OperationId`/… types build one isolated instance per tenant — each with its own
`serverUrl`, bearer token, and middleware.

The generated module exports `createClient` in **both runtimes**, so the same pattern
works with the default `inline` mode (import it from the generated file instead). This
example uses `runtime: package` to also show the factory coming from the installed package.

## Run

```bash
npm install
npm run generate   # regenerate src/api from openapi.yaml (optional; client is checked in)
npm run dev        # open the printed local URL
```

The app uses a canned `fetch` that echoes the tenant host and `Authorization` header, so the
per-instance isolation is visible offline. The generated client under `src/api/` is committed
and drift-checked against the generator in CI.
