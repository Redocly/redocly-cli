# mock example

Generated TypeScript client plus **MSW** mocks (`generators: ['sdk', 'mock']`). The app starts an MSW
browser worker from the generated `handlers`, then calls the sdk — requests are served by the mocks, no
real backend required.

## Run

```bash
npm install
npm run generate   # regenerate src/api from openapi.yaml (optional; client is checked in)
npm run dev        # open the printed local URL
```

The generated client + MSW mocks under `src/api/` are committed and drift-checked against the
generator in CI.
