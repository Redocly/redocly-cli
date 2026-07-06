# fetch-functions example

Generated TypeScript client (`generators: ['sdk']`), consumed as free
functions (`configure()`, `listMenuItems()`), with `ApiError` handling.

## Run

```bash
npm install
npm run generate   # regenerate src/api from openapi.yaml (optional; client is checked in)
npm run dev        # open the printed local URL
```

The generated client under `src/api/` is committed and drift-checked against the generator in CI.
Point `configure({ serverUrl })` at your own server or a mock as needed.
