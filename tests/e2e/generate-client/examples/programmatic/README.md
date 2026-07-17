# programmatic example

Generates the client **programmatically** with `generateClient(...)` from
`@redocly/client-generator` — the same API the `redocly generate-client` CLI uses — instead of a
`redocly.yaml`. See [`generate.ts`](./generate.ts). Useful when generation is part of a build script,
codegen pipeline, or test setup.

## Run

```bash
npm install
npm run generate   # runs generate.ts → writes src/api/client.ts
```

The generated client under `src/api/` is gitignored; CI regenerates it and type-checks this example.
`generateClient(...)` returns `{ outputPath, bytes, files }`.
