# service-class example

Generated TypeScript client using the **service-class facade** (`generators: ['sdk']`). Operations are
methods on a `Client` configured per instance (`new Client({ serverUrl })`).

## Run

```bash
npm install
npm run generate   # regenerate src/api from openapi.yaml (optional; client is checked in)
npm run dev        # open the printed local URL
```

The generated client under `src/api/` is committed and drift-checked against the generator in CI.
