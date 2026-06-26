# tanstack-query example

Generated TypeScript client plus **TanStack Query** (React) factories
(`generators: ['sdk', 'tanstack-query']`). The app uses `useQuery(<op>Options())` under a
`QueryClientProvider`.

## Run

```bash
npm install
npm run generate   # regenerate src/api from openapi.yaml (optional; client is checked in)
npm run dev        # open the printed local URL
```

The generated client + TanStack factories under `src/api/` are committed and drift-checked against the
generator in CI.
