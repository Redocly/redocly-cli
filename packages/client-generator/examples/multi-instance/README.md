# multi-instance example

Per-tenant client instances from one generated module: the generated `createClient`
factory plus the `OPERATIONS` descriptors and `Ops`/`OperationId`/… types build one
isolated instance per tenant — each with its own `serverUrl`, bearer token, and
middleware. Everything comes from the generated file; nothing is module-global.

## Run

```bash
npm install
npm run generate   # generate src/api (the client is gitignored)
npm run dev        # open the printed local URL
```

The app uses a canned `fetch` that echoes the tenant host and `Authorization` header, so the
per-instance isolation is visible offline. The generated client under `src/api/` is gitignored; CI regenerates it and type-checks this example.
