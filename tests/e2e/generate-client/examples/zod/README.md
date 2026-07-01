# zod example

Generated TypeScript client plus **zod** schemas (`generators: ['sdk', 'zod']`). The app fetches with
the sdk, then validates the response at runtime against the generated `*.zod` schema.

## Run

```bash
npm install
npm run generate   # regenerate src/api from openapi.yaml (optional; client is checked in)
npm run dev        # open the printed local URL
```

The generated client + zod schemas under `src/api/` are committed and drift-checked against the
generator in CI.
